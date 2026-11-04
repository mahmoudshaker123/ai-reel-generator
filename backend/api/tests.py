import tempfile
import subprocess
from pathlib import Path
from unittest.mock import patch
import imageio_ffmpeg
from django.test import TransactionTestCase, override_settings
from django.core.files import File
from .models import Project, MediaFile, RenderJob
from .reel_generator import generate_reel_timeline, parse_prompt
from .media_tools import probe
from .render_service import render


class StudioTests(TransactionTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.settings_override = override_settings(MEDIA_ROOT=self.temp.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        source = Path(self.temp.name)/'fixture.mp4'
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel','error', '-f','lavfi','-i',
                        'testsrc2=size=160x240:rate=30:duration=4', '-f','lavfi','-i',
                        'sine=frequency=440:duration=4','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',str(source)],check=True,capture_output=True)
        self.project = Project.objects.create(title='Regression fixture')
        with source.open('rb') as stream:
            self.media = MediaFile.objects.create(project=self.project,media_type='video',status='ready',
                       original_name='fixture.mp4',file=File(stream,name='fixture.mp4'),size=source.stat().st_size,duration=4)

    def test_metadata_and_ranges(self):
        info=probe(self.media.file.path)
        self.assertAlmostEqual(info['duration'],4,delta=.1)
        self.assertTrue(info['has_audio'])
        response=self.client.get(self.media.file.url,HTTP_RANGE='bytes=10-29')
        self.assertEqual(response.status_code,206)
        self.assertEqual(len(b''.join(response.streaming_content)),20)
        response=self.client.get(self.media.file.url,HTTP_RANGE='bytes=-10')
        self.assertEqual(len(b''.join(response.streaming_content)),10)
        self.assertEqual(self.client.get(self.media.file.url,HTTP_RANGE='bytes=999999999-').status_code,416)

    def test_missing_input_does_not_create_project(self):
        before=Project.objects.count()
        self.assertEqual(self.client.post('/api/generate-reel/',{'prompt':'captions'}).status_code,400)
        self.assertEqual(Project.objects.count(),before)

    def test_ai_failure_is_not_fabricated_success(self):
        with patch('api.reel_generator.analyze_video_with_gemini',return_value={'success':False,'message':'quota exceeded'}):
            with self.assertRaisesRegex(ValueError,'quota exceeded'):
                generate_reel_timeline(self.media,'captions')

    def test_captions_follow_source_after_silence_cut(self):
        analysis={'success':True,'model':'mock','silence_intervals':[{'startTime':1,'endTime':2}],
                  'segments':[{'text':'after the cut','startTime':2.2,'endTime':3.2,
                               'words':[{'word':'after','startTime':2.2,'endTime':2.5}]}]}
        with patch('api.reel_generator.analyze_video_with_gemini',return_value=analysis):
            timeline,_,_=generate_reel_timeline(self.media,'remove silence captions')
        self.assertEqual(timeline['duration'],3)
        caption=next(c for t in timeline['tracks'] for c in t['clips'] if c['type']=='caption')
        self.assertAlmostEqual(caption['segments'][0]['startTime'],1.2)
        self.assertAlmostEqual(caption['segments'][0]['words'][0]['startTime'],1.2)

    def test_caption_modes_and_visual_director_use_reference_style(self):
        words = [
            {'word': word, 'startTime': index * .4, 'endTime': (index + 1) * .4}
            for index, word in enumerate(('واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة'))
        ]
        analysis = {
            'success': True,
            'model': 'mock',
            'silence_intervals': [],
            'segments': [{'text': ' '.join(w['word'] for w in words), 'startTime': 0, 'endTime': 2.4, 'words': words}],
            'visual_beats': [{
                'startTime': .5,
                'endTime': 2.2,
                'description': 'شرح نسبة التحسن',
                'layout': 'stat_card',
                'headline': 'تحسن النتيجة',
                'stat_value': '35%',
                'stat_label': 'بعد تطبيق الخطوات',
            }],
            'design_style': {
                'primaryColor': '#123456',
                'accentColor': '#ABCDEF',
                'captionColor': '#FEDCBA',
                'cardColor': '#222222',
            },
            'hook_title': 'اختبار',
            'cta_text': 'تابع',
            'summary': 'ملخص',
        }
        with patch('api.reel_generator.analyze_video_with_gemini', return_value=analysis) as analyzer:
            timeline, actions, _ = generate_reel_timeline(
                self.media,
                'captions shapes',
                caption_mode='sentence',
                reference_image_path='style.png',
                visual_director=True,
            )

        analyzer.assert_called_once_with(self.media.file.path, 'captions shapes', reference_image_path='style.png')
        caption = next(c for t in timeline['tracks'] for c in t['clips'] if c['type'] == 'caption')
        self.assertEqual(caption['animationType'], 'sentence')
        self.assertEqual([len(segment['words']) for segment in caption['segments']], [4, 2])
        self.assertEqual(caption['style']['color'], '#FEDCBA')
        card = next(c for t in timeline['tracks'] for c in t['clips'] if c['type'] == 'text' and '35%' in c.get('content', ''))
        self.assertEqual(card['transform']['width'], 44)
        self.assertEqual(card['style']['backgroundColor'], '#222222')
        self.assertTrue(any('مشاهد توضيحية' in action for action in actions))

    def test_export_creates_decodable_video_with_audio_and_arabic(self):
        timeline,_,_=generate_reel_timeline(self.media,'keep original')
        self.assertFalse(parse_prompt('keep original')['add_captions'])
        timeline['tracks'].append({'id':'text','order':9,'clips':[{'id':'title','type':'text','startTime':0,
            'duration':2,'content':'اختبار الفيديو','transform':{'x':0,'y':0},
            'style':{'fontSize':54,'color':'#ffffff','backgroundColor':'#000000'}}]})
        job=RenderJob.objects.create(project=self.project,timeline_snapshot=timeline,resolution='720x1280',fps=30,format='mp4')
        render(str(job.id));job.refresh_from_db()
        self.assertEqual(job.status,'completed',job.error_message)
        result=Path(self.temp.name)/'renders'/f'{job.id}.mp4'
        info=probe(result)
        self.assertTrue(info['has_audio']);self.assertEqual(info['width'],720)
        self.assertAlmostEqual(info['duration'],4,delta=.15)
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(result),'-f','null','-'],check=True,capture_output=True)

    @patch('api.views.get_gemini_api_key', return_value='local-test-key')
    @patch('api.views.genai.Client')
    def test_director_applies_allowlisted_hook_edit(self, client_factory, _key):
        import json
        from unittest.mock import MagicMock
        timeline = {
            'id': str(self.project.id), 'title': 'Director fixture', 'duration': 4,
            'tracks': [
                {'id': 'text', 'type': 'text', 'clips': [
                    {'id': 'hook', 'type': 'text', 'startTime': 0, 'duration': 3, 'content': 'Old hook'}]},
                {'id': 'captions', 'type': 'caption', 'clips': []},
            ],
        }
        self.project.timeline_json = timeline
        self.project.save(update_fields=['timeline_json'])
        client = MagicMock()
        client.models.generate_content.return_value.text = json.dumps({
            'message': 'تم تحسين الهوك',
            'edits': [{'type': 'hook_text', 'value': 'افتتاحية أوضح'}],
        }, ensure_ascii=False)
        client_factory.return_value = client

        response = self.client.post(
            f'/api/projects/{self.project.id}/director/',
            {'prompt': 'اجعل عنوان البداية أوضح'}, format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['changed'])
        self.assertEqual(response.data['timeline']['tracks'][0]['clips'][0]['content'], 'افتتاحية أوضح')
        self.project.refresh_from_db()
        self.assertEqual(self.project.timeline_json['tracks'][0]['clips'][0]['content'], 'افتتاحية أوضح')
        client.close.assert_called_once()

    @patch('api.views.get_gemini_api_key', return_value='local-test-key')
    @patch('api.views.genai.Client', side_effect=AssertionError('quick edits must stay local'))
    def test_director_quick_caption_edit_needs_no_network(self, _client, _key):
        self.project.timeline_json = {
            'id': str(self.project.id), 'title': 'Quick edit fixture', 'duration': 4,
            'tracks': [{
                'id': 'captions', 'type': 'caption', 'hidden': False, 'clips': [{
                    'id': 'caption', 'type': 'caption', 'startTime': 0, 'duration': 4,
                    'style': {'fontSize': 64, 'showBackground': True, 'backgroundOpacity': 0.7},
                    'segments': [],
                }],
            }],
        }
        self.project.save(update_fields=['timeline_json'])
        response = self.client.post(
            f'/api/projects/{self.project.id}/director/',
            {'prompt': 'كبّر الكابشن قليلًا وخلي خلفيته شفافة'}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        caption = response.data['timeline']['tracks'][0]['clips'][0]
        self.assertEqual(caption['style']['fontSize'], 72)
        self.assertEqual(caption['style']['backgroundOpacity'], 0)
        self.assertTrue(response.data['changed'])

    def test_export_failure_does_not_return_fake_download(self):
        job=RenderJob.objects.create(project=self.project,timeline_snapshot={'duration':1,'tracks':[]},resolution='720x1280',fps=30,format='mp4')
        render(str(job.id));job.refresh_from_db()
        self.assertEqual(job.status,'failed');self.assertFalse(job.output_url)

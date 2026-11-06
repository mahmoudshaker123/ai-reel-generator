import tempfile
import subprocess
from pathlib import Path
from unittest.mock import patch
import imageio_ffmpeg
from django.test import TransactionTestCase, override_settings
from django.core.files import File
from django.contrib.auth.models import User
from .models import Project, MediaFile, RenderJob, UserSubscription, SubscriptionOrder
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
        self.assertIn('■■■■□□□□□□', card['content'])
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

    @patch('api.views.get_gemini_api_key', return_value='local-test-key')
    @patch('api.views.genai.Client')
    def test_director_applies_visual_card_and_split_layout(self, client_factory, _key):
        import json
        from unittest.mock import MagicMock
        timeline = {
            'id': str(self.project.id), 'title': 'Visual test', 'duration': 6,
            'tracks': [
                {'id': 'video', 'type': 'video', 'clips': [
                    {'id': 'v1', 'type': 'video', 'startTime': 0, 'duration': 6, 'transform': {'x': 0, 'y': 0, 'width': 100, 'height': 100}}
                ]},
                {'id': 'text', 'type': 'text', 'clips': []},
            ],
        }
        self.project.timeline_json = timeline
        self.project.save(update_fields=['timeline_json'])
        client = MagicMock()
        client.models.generate_content.return_value.text = json.dumps({
            'message': 'تم إضافة كارت توضيحي وتقسيم المشهد',
            'edits': [
                {'type': 'split_layout', 'value': 'side'},
                {'type': 'add_visual_card', 'value': {
                    'headline': 'نقص تشبع الأكسجين',
                    'stat_value': '85%',
                    'stat_label': 'نسبة الأكسجين بالدم',
                    'startTime': 1.5,
                    'duration': 3.5,
                    'position': 'left',
                }},
            ],
        }, ensure_ascii=False)
        client_factory.return_value = client

        response = self.client.post(
            f'/api/projects/{self.project.id}/director/',
            {'prompt': 'اعمل كارت توضيحي وقسم الشاشة'}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['changed'])
        video_clip = response.data['timeline']['tracks'][0]['clips'][0]
        self.assertEqual(video_clip['transform']['x'], 180)
        self.assertEqual(video_clip['transform']['width'], 60)
        text_clips = response.data['timeline']['tracks'][1]['clips']
        self.assertEqual(len(text_clips), 1)
        self.assertIn('85%', text_clips[0]['content'])
        self.assertIn('■■■■■■■■■□', text_clips[0]['content'])
        self.assertEqual(text_clips[0]['transform']['x'], -240)
        client.close.assert_called_once()

    def test_export_failure_does_not_return_fake_download(self):
        job=RenderJob.objects.create(project=self.project,timeline_snapshot={'duration':1,'tracks':[]},resolution='720x1280',fps=30,format='mp4')
        render(str(job.id));job.refresh_from_db()
        self.assertEqual(job.status,'failed');self.assertFalse(job.output_url)

    @patch('api.gemini_service.get_gemini_api_key', return_value='test-key')
    @patch('api.views.genai.Client')
    def test_director_generates_infographic_image_and_split_screen(self, client_factory, _key):
        timeline = {
            'id': str(self.project.id), 'title': 'Split Screen Test', 'duration': 8,
            'tracks': [
                {'id': 'video', 'type': 'video', 'clips': [
                    {'id': 'v1', 'type': 'video', 'startTime': 0, 'duration': 8, 'transform': {'x': 0, 'y': 0, 'width': 100, 'height': 100}}
                ]},
            ],
        }
        self.project.timeline_json = timeline
        self.project.save(update_fields=['timeline_json'])

        response = self.client.post(
            f'/api/projects/{self.project.id}/director/',
            {'prompt': 'اعمل صور توضح اللي بيشرحه واقسم الشاشه'}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['changed'])

        # Check video was split to bottom 50%
        v_clip = response.data['timeline']['tracks'][0]['clips'][0]
        self.assertEqual(v_clip['transform']['y'], 480)
        self.assertEqual(v_clip['transform']['height'], 50)

        # Check image track was created and has an image clip in top 50%
        img_track = next((t for t in response.data['timeline']['tracks'] if t['type'] == 'image'), None)
        self.assertIsNotNone(img_track)
        self.assertTrue(len(img_track['clips']) >= 1)
        img_clip = img_track['clips'][0]
        self.assertEqual(img_clip['type'], 'image')
        self.assertEqual(img_clip['transform']['y'], -480)
        self.assertEqual(img_clip['transform']['height'], 50)
        self.assertTrue(img_clip['mediaUrl'].endswith('.png'))

    def test_auth_google_direct_profile(self):
        response = self.client.post('/api/auth/google/', {
            'email': 'creator_direct@gmail.com',
            'name': 'Direct Creator',
            'avatar': 'https://avatar.test/pic.png',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['user']['email'], 'creator_direct@gmail.com')
        self.assertEqual(response.data['user']['name'], 'Direct Creator')

        # Check session / auth_me
        me_res = self.client.get('/api/auth/me/')
        self.assertEqual(me_res.status_code, 200)
        self.assertTrue(me_res.data['authenticated'])
        self.assertEqual(me_res.data['user']['email'], 'creator_direct@gmail.com')

    def test_auth_google_jwt_credential(self):
        import base64
        import json
        payload = json.dumps({
            'email': 'oauth_creator@gmail.com',
            'name': 'OAuth Google User',
            'picture': 'https://lh3.googleusercontent.com/test.jpg',
        })
        payload_b64 = base64.urlsafe_b64encode(payload.encode()).decode().rstrip('=')
        mock_jwt = f"fakeheader.{payload_b64}.fakesignature"

        response = self.client.post('/api/auth/google/', {
            'credential': mock_jwt,
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['user']['email'], 'oauth_creator@gmail.com')
        self.assertEqual(response.data['user']['name'], 'OAuth Google User')
        self.assertEqual(response.data['user']['avatar'], 'https://lh3.googleusercontent.com/test.jpg')

    def test_auth_logout(self):
        # Sign in first
        self.client.post('/api/auth/google/', {'email': 'logout_test@gmail.com'}, format='json')
        # Confirm logged in
        me1 = self.client.get('/api/auth/me/')
        self.assertTrue(me1.data['authenticated'])
        # Logout
        out_res = self.client.post('/api/auth/logout/')
        self.assertEqual(out_res.status_code, 200)
        # Confirm logged out
        me2 = self.client.get('/api/auth/me/')
        self.assertFalse(me2.data['authenticated'])

    def test_user_project_isolation(self):
        u1 = User.objects.create(username='u1_creator', email='u1@test.com')
        u2 = User.objects.create(username='u2_creator', email='u2@test.com')

        # Create project for user 1
        p1 = self.client.post('/api/projects/', {'title': 'مشروع المستخدم الأول'}, format='json', HTTP_X_USER_EMAIL='u1@test.com')
        self.assertEqual(p1.status_code, 201)

        # Create project for user 2
        p2 = self.client.post('/api/projects/', {'title': 'مشروع المستخدم الثاني'}, format='json', HTTP_X_USER_EMAIL='u2@test.com')
        self.assertEqual(p2.status_code, 201)

        # User 1 lists projects -> only see user 1's project
        list_u1 = self.client.get('/api/projects/', HTTP_X_USER_EMAIL='u1@test.com')
        self.assertEqual(list_u1.status_code, 200)
        titles_u1 = [p['title'] for p in list_u1.data['data']]
        self.assertIn('مشروع المستخدم الأول', titles_u1)
        self.assertNotIn('مشروع المستخدم الثاني', titles_u1)

        # User 2 lists projects -> only see user 2's project
        list_u2 = self.client.get('/api/projects/', HTTP_X_USER_EMAIL='u2@test.com')
        self.assertEqual(list_u2.status_code, 200)
        titles_u2 = [p['title'] for p in list_u2.data['data']]
        self.assertIn('مشروع المستخدم الثاني', titles_u2)
        self.assertNotIn('مشروع المستخدم الأول', titles_u2)

    def test_auth_update_profile(self):
        u = User.objects.create(username='edit_user', email='edit_user@test.com', first_name='Old Name')
        res = self.client.post('/api/auth/profile/', {'name': 'New Creator Name'}, format='json', HTTP_X_USER_EMAIL='edit_user@test.com')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['user']['name'], 'New Creator Name')
        u.refresh_from_db()
        self.assertEqual(u.first_name, 'New Creator Name')

    def test_subscription_plans_endpoint(self):
        res = self.client.get('/api/subscriptions/plans/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'success')
        self.assertTrue(len(res.data['plans']) >= 4)
        self.assertIn('vodafone_cash', res.data['payment_info'])

    def test_free_quota_exceeded_blocks_generation(self):
        u = User.objects.create(username='quota_user', email='quota@test.com')
        sub = UserSubscription.objects.create(user=u, plan='free', video_credits_total=3, video_credits_used=3)
        self.assertFalse(sub.can_generate)

        # Try to generate reel
        res = self.client.post('/api/generate-reel/', {
            'prompt': 'فيديو تجريبي',
        }, format='multipart', HTTP_X_USER_EMAIL='quota@test.com')
        self.assertEqual(res.status_code, 402)
        self.assertEqual(res.data['error_code'], 'quota_exceeded')
        self.assertIn('/pricing', res.data['upgrade_url'])

    def test_subscription_checkout_and_admin_approve(self):
        u = User.objects.create(username='buyer_user', email='buyer@test.com')
        checkout_res = self.client.post('/api/subscriptions/checkout/', {
            'plan_id': 'pro',
            'plan_title': 'باقة المحترف (Pro)',
            'amount': '590.00',
            'payment_method': 'vodafone_cash',
            'sender_phone': '01012345678',
            'transaction_reference': 'TX-998877',
            'notes': 'تم التحويل من محفظة فودافون كاش',
        }, format='multipart', HTTP_X_USER_EMAIL='buyer@test.com')

        self.assertEqual(checkout_res.status_code, 201)
        order_id = checkout_res.data['order_id']
        order = SubscriptionOrder.objects.get(id=order_id)
        self.assertEqual(order.status, 'pending')

        # Admin approves order
        approve_res = self.client.post(f'/api/subscriptions/admin/orders/{order_id}/action/', {
            'action': 'approve',
        }, format='json')
        self.assertEqual(approve_res.status_code, 200)

        order.refresh_from_db()
        self.assertEqual(order.status, 'approved')

        sub = UserSubscription.objects.get(user=u)
        self.assertEqual(sub.plan, 'pro')
        self.assertEqual(sub.video_credits_total, 100)
        self.assertTrue(sub.can_generate)

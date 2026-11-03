"""Local FFmpeg renderer. A job completes only after a playable file exists."""
import os
import threading
import tempfile
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageColor
import imageio_ffmpeg
from django.conf import settings
from django.db import close_old_connections
from django.utils import timezone
from .models import RenderJob, MediaFile
from .media_tools import probe


def text_sprite(text, style, path, width, scale):
    font_path = os.environ.get('REEL_FONT_PATH')
    if not font_path:
        font_path = next((p for p in ['C:/Windows/Fonts/arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'] if Path(p).exists()), None)
    if not font_path:
        raise ValueError('Configure REEL_FONT_PATH to a font supporting Arabic.')
    size = max(8, int(style.get('fontSize', 48) * scale))
    font = ImageFont.truetype(font_path, size)
    pad = max(4, int(style.get('backgroundPadding', 12) * scale))
    measure = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    lines = []
    for paragraph in text.splitlines() or ['']:
        line = ''
        for word in paragraph.split():
            candidate = f'{line} {word}'.strip()
            if line and measure.textlength(candidate, font=font) > width - pad * 2:
                lines.append(line)
                line = word
            else:
                line = candidate
        lines.append(line)
    line_h = int(size * style.get('lineHeight', 1.4))
    width = min(width, max(1, int(max(measure.textlength(line, font=font) for line in lines)) + pad * 2))
    image = Image.new('RGBA', (width, line_h * len(lines) + pad * 2))
    draw = ImageDraw.Draw(image)
    if style.get('showBackground', True) and style.get('backgroundColor', 'transparent') != 'transparent':
        color = ImageColor.getrgb(style.get('backgroundColor', '#000000'))[:3]
        draw.rounded_rectangle((0, 0, image.width-1, image.height-1), radius=int(style.get('backgroundBorderRadius', 8)*scale),
                               fill=(*color, int(255 * style.get('backgroundOpacity', .8))))
    for i, line in enumerate(lines):
        draw.text((width/2, pad + i*line_h), line, font=font, anchor='mt', fill=style.get('color', '#ffffff'),
                  stroke_width=int(style.get('stroke', {}).get('width', 0)*scale),
                  stroke_fill=style.get('stroke', {}).get('color', '#000000'))
    image.save(path)
    return image.height


def render(job_id):
    close_old_connections()
    job = RenderJob.objects.get(id=job_id)
    output = Path(settings.MEDIA_ROOT) / 'renders' / f'{job.id}.mp4'
    try:
        job.status = 'processing'; job.progress = 5; job.save()
        timeline = job.timeline_snapshot
        duration = float(timeline.get('duration', 0))
        if not 0 < duration <= 3600:
            raise ValueError('Export duration must be between 0 and 3600 seconds.')
        if job.resolution not in ('1080x1920', '720x1280', '1920x1080', '1080x1080') or job.fps not in (24, 25, 30, 60) or job.format != 'mp4':
            raise ValueError('Unsupported export settings.')
        width, height = map(int, job.resolution.split('x'))
        original_w = float(timeline.get('width', 1080)); original_h = float(timeline.get('height', 1920))
        sx, sy = width / original_w, height / original_h
        clips = [(track, clip) for track in sorted(timeline.get('tracks', []), key=lambda t:t['order'])
                 if not track.get('hidden') for clip in track.get('clips', [])]
        if not clips:
            raise ValueError('Add media to the timeline before exporting.')
        # Resolve database media IDs only: never fetch arbitrary timeline URLs or local paths.
        media = {str(m.id): m for m in MediaFile.objects.filter(project=job.project)}
        output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='reel-render-') as temp:
            args = [imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-hide_banner', '-loglevel', 'error', '-filter_complex_threads', '1',
                    '-f', 'lavfi', '-i', f'color=c=black:s={width}x{height}:r={job.fps}:d={duration}',
                    '-f', 'lavfi', '-i', f'anullsrc=r=48000:cl=stereo:d={duration}']
            filters = []; video = '0:v'; audio = ['1:a']; idx = 2; overlay_count = 0
            def overlay(source, clip, start, end, sprite_height=None):
                nonlocal video, overlay_count
                transform = clip.get('transform', {})
                x = width/2 + float(transform.get('x',0))*sx
                y = height/2 + float(transform.get('y',0))*sy
                label = f'v{overlay_count}'; overlay_count += 1
                filters.append(f'[{video}][{source}]overlay=x={x}-overlay_w/2:y={y}-overlay_h/2:eof_action=pass:enable=\'between(t,{start},{end})\'[{label}]')
                video = label
            for track, clip in clips:
                kind = clip['type']; start = max(0,float(clip['startTime'])); length = float(clip['duration']); end = start + length
                if length <= 0:
                    continue
                if kind in ('video', 'audio', 'image'):
                    source = media.get(str(clip.get('mediaFileId')))
                    if not source or not source.file or not Path(source.file.path).exists():
                        raise ValueError('A media file is missing. Upload it again before export.')
                    speed = float(clip.get('playbackSpeed', 1)) if kind == 'video' else 1
                    if not .25 <= speed <= 4:
                        raise ValueError('Playback speed must be between 0.25 and 4.')
                    if kind == 'image':
                        args += ['-loop', '1', '-t', str(length), '-i', source.file.path]
                    else:
                        args += ['-ss', str(max(0,float(clip.get('trimStart',0)))), '-t', str(length * speed), '-i', source.file.path]
                    if kind != 'audio':
                        t = clip.get('transform', {}); cg = clip.get('colorGrade', {})
                        w = max(2, int(width * float(t.get('width',100))/100 * float(t.get('scaleX',1)))//2*2)
                        h = max(2, int(height * float(t.get('height',100))/100 * float(t.get('scaleY',1)))//2*2)
                        label = f'layer{idx}'
                        chain = f'[{idx}:v]setpts=(PTS-STARTPTS)/{speed}+{start}/TB,scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black@0,setsar=1,format=rgba'
                        chain += f",eq=brightness={float(cg.get('brightness',0))}:contrast={1+float(cg.get('contrast',0))}:saturation={1+float(cg.get('saturation',0))}"
                        chain += f",colorchannelmixer=aa={float(t.get('opacity',1))}"
                        if t.get('rotation'):
                            chain += f",rotate={float(t['rotation'])}*PI/180:ow=rotw(iw):oh=roth(ih):c=none"
                        filters.append(chain+f'[{label}]'); overlay(label, clip, start, end)
                    if kind != 'image' and not track.get('muted') and not clip.get('muted') and probe(source.file.path)['has_audio']:
                        gain = max(0,min(1,float(clip.get('volume',1))*float(timeline.get('globalAudio',{}).get('masterVolume',1))))
                        tempo = []; rate = speed
                        while rate < .5: tempo.append('atempo=0.5'); rate /= .5
                        while rate > 2: tempo.append('atempo=2'); rate /= 2
                        tempo.append(f'atempo={rate}')
                        chain = f'[{idx}:a]asetpts=PTS-STARTPTS,' + ','.join(tempo) + f',aresample=48000,volume={gain}'
                        fade = clip.get('audioFade', {})
                        if fade.get('fadeIn',0)>0: chain += f",afade=t=in:d={min(length,float(fade['fadeIn']))}"
                        if fade.get('fadeOut',0)>0: chain += f",afade=t=out:st={max(0,length-float(fade['fadeOut']))}:d={min(length,float(fade['fadeOut']))}"
                        chain += f',adelay={round(start*1000)}:all=1[a{idx}]'
                        filters.append(chain); audio.append(f'a{idx}')
                    idx += 1
                elif kind in ('text', 'caption'):
                    segments = clip.get('segments', []) if kind == 'caption' else [{'text':clip.get('content',''), 'startTime':0, 'endTime':length}]
                    if kind == 'caption' and clip.get('animationType') == 'word_by_word':
                        segments = [dict(w, text=w['word']) for seg in segments for w in (seg.get('words') or [dict(seg, word=seg['text'])])]
                    for segment in segments:
                        a = max(start,start+float(segment['startTime'])); b = min(end,start+float(segment['endTime']))
                        if b <= a or not segment.get('text'):
                            continue
                        png = Path(temp) / f'{idx}.png'
                        text_sprite(segment['text'], clip.get('style',{}), png, int(width*.9), sx)
                        args += ['-loop','1','-t',str(duration),'-i',str(png)]
                        overlay(f'{idx}:v', clip, a, b); idx += 1
            filters.append(''.join(f'[{a}]' for a in audio)+f'amix=inputs={len(audio)}:duration=longest:normalize=0,alimiter=limit=0.95[aout]')
            filters.append(f'[{video}]format=yuv420p[vout]')
            graph = Path(temp)/'filters.txt'; graph.write_text(';\n'.join(filters),encoding='utf-8')
            args += ['-/filter_complex',str(graph),'-map','[vout]','-map','[aout]','-t',str(duration),'-r',str(job.fps),
                     '-c:v','libx264','-preset','veryfast','-crf','20','-c:a','aac','-b:a','192k','-movflags','+faststart',str(output)]
            job.progress=20; job.save(update_fields=['progress'])
            result = subprocess.run(args,capture_output=True,timeout=max(180,duration*20))
            if result.returncode:
                raise ValueError('FFmpeg export failed: '+result.stderr.decode(errors='replace')[-700:])
        probe(output)
        job.status='completed'; job.progress=100; job.output_url=f'/media/renders/{job.id}.mp4'; job.completed_at=timezone.now()
    except Exception as error:
        output.unlink(missing_ok=True)
        job.status='failed'; job.error_message=str(error); job.completed_at=timezone.now()
    finally:
        job.save(); close_old_connections()

def start_render(job_id):
    threading.Thread(target=render,args=(job_id,),daemon=True).start()

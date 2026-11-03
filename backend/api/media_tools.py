"""Metadata and seekable local media delivery."""
import re
import subprocess
from pathlib import Path
import mimetypes
import imageio_ffmpeg
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse, StreamingHttpResponse

def probe(path):
    result = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-i', str(path)],
                            capture_output=True, timeout=30)
    text = result.stderr.decode('utf-8', errors='replace')
    match = re.search(r'Duration: (\d+):(\d+):(\d+(?:\.\d+)?)', text)
    if not match:
        raise ValueError('Cannot read media duration')
    h, m, s = map(float, match.groups())
    size = re.search(r'Video:.*?\b(\d{2,5})x(\d{2,5})\b', text)
    fps = re.search(r'([\d.]+) fps', text)
    return {'duration': h * 3600 + m * 60 + s, 'has_audio': 'Audio:' in text,
            'width': int(size[1]) if size else None, 'height': int(size[2]) if size else None,
            'fps': float(fps[1]) if fps else None}

def serve_media(request, path):
    root = Path(settings.MEDIA_ROOT).resolve()
    target = (root / path).resolve()
    if not target.is_relative_to(root) or not target.is_file():
        raise Http404
    size = target.stat().st_size
    content_type = mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
    range_header = request.headers.get('Range', '')
    if not range_header:
        response = FileResponse(target.open('rb'), content_type=content_type)
    else:
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', range_header)
        if not match or not any(match.groups()):
            return HttpResponse(status=416, headers={'Content-Range': f'bytes */{size}'})
        start = int(match[1]) if match[1] else max(0, size - int(match[2]))
        end = min(size - 1, int(match[2])) if match[1] and match[2] else size - 1
        if start > end or start >= size:
            return HttpResponse(status=416, headers={'Content-Range': f'bytes */{size}'})
        def chunks():
            with target.open('rb') as stream:
                stream.seek(start)
                remaining = end - start + 1
                while remaining:
                    chunk = stream.read(min(65536, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk
        response = StreamingHttpResponse(chunks(), status=206, content_type=content_type)
        response['Content-Range'] = f'bytes {start}-{end}/{size}'
        response['Content-Length'] = str(end - start + 1)
    response['Accept-Ranges'] = 'bytes'
    return response

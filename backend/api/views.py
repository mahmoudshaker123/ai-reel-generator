"""
API Views — REST endpoints for Reel Studio
"""
import os
import json
import re
import mimetypes
from datetime import timezone

from django.shortcuts import get_object_or_404
from django.utils import timezone as dj_timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .models import Project, MediaFile, RenderJob, AIJob
from .serializers import (
    ProjectSerializer, ProjectListSerializer,
    MediaFileSerializer, RenderJobSerializer, AIJobSerializer,
    MediaUploadSerializer, AIJobCreateSerializer,
)
from .ai_service import start_ai_job
from google import genai
from google.genai import types as genai_types
from .gemini_service import ACTIVE_MODELS, get_gemini_api_key, save_gemini_api_key, test_gemini_key, public_error


# ─── Gemini Settings ──────────────────────────────────────────
@api_view(['GET', 'POST'])
def gemini_key_settings(request):
    if request.method == 'GET':
        key = get_gemini_api_key()
        masked = f"{key[:6]}...{key[-4:]}" if len(key) > 10 else ("Configured" if key else "")
        return Response({
            'configured': bool(key),
            'masked_key': masked,
            'model': os.environ.get('GEMINI_MODEL', 'gemini-3.1-flash-lite'),
        })

    # POST: set/update key
    api_key = request.data.get('api_key', '').strip()
    if not api_key:
        return Response({'status': 'error', 'message': 'يرجى تقديم مفتاح API صالح.'}, status=status.HTTP_400_BAD_REQUEST)

    # Test the key first
    test_res = test_gemini_key(api_key)
    if not test_res.get('valid'):
        return Response({
            'status': 'error',
            'message': f"فشل التحقق من مفتاح Gemini API: {test_res.get('error')}",
        }, status=status.HTTP_400_BAD_REQUEST)

    saved = save_gemini_api_key(api_key)
    if saved:
        return Response({
            'status': 'success',
            'message': f"تم تفعيل Gemini Pro بنجاح عبر نموذج {test_res.get('model')} 🚀",
            'model': test_res.get('model'),
        })
    return Response({'status': 'error', 'message': 'تعذر حفظ المفتاح محلياً.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Health Check ─────────────────────────────────────────────
@api_view(['GET'])
def health_check(request):
    return Response({'status': 'ok', 'message': 'Reel Studio API is running 🎬'})


# ══════════════════════════════════════════════════════════════
# PROJECTS
# ══════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
def projects_list(request):
    if request.method == 'GET':
        qs = Project.objects.all()
        serializer = ProjectListSerializer(qs, many=True)
        return Response({'data': serializer.data})

    serializer = ProjectSerializer(data=request.data)
    if serializer.is_valid():
        project = serializer.save()
        return Response(
            {'data': ProjectSerializer(project).data},
            status=status.HTTP_201_CREATED,
        )
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def project_detail(request, project_id):
    project = get_object_or_404(Project, id=project_id)

    if request.method == 'GET':
        return Response({'data': ProjectSerializer(project, context={'request': request}).data})

    if request.method in ('PUT', 'PATCH'):
        partial = request.method == 'PATCH'
        serializer = ProjectSerializer(project, data=request.data, partial=partial)
        if serializer.is_valid():
            project = serializer.save()
            return Response({'data': ProjectSerializer(project).data})
        return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        project.delete()
        return Response({'message': 'Project deleted'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
def save_timeline(request, project_id):
    """POST /api/projects/<id>/timeline/ — save full timeline JSON"""
    project = get_object_or_404(Project, id=project_id)
    timeline = request.data.get('timeline')
    if not timeline:
        return Response({'error': 'timeline is required'}, status=status.HTTP_400_BAD_REQUEST)

    project.timeline_json = timeline
    project.title    = timeline.get('title', project.title)
    project.duration = timeline.get('duration', project.duration)
    project.fps      = timeline.get('fps', project.fps)
    project.save()
    return Response({'message': 'Timeline saved', 'updated_at': project.updated_at.isoformat()})


@api_view(['POST'])
def director_edit(request, project_id):
    """Interpret a short natural-language director request and apply allowlisted timeline edits."""
    prompt = str(request.data.get('prompt', '')).strip()
    if not prompt or len(prompt) > 800:
        return Response({'error': 'اكتب طلب تعديل قصيرًا (حتى ٨٠٠ حرف).'}, status=400)
    project = get_object_or_404(Project, id=project_id)
    timeline = project.timeline_json or {}
    api_key = get_gemini_api_key()
    if not api_key:
        return Response({'error': 'أضف مفتاح Gemini أولاً.'}, status=400)

    text_clips = [clip for track in timeline.get('tracks', []) for clip in track.get('clips', []) if clip.get('type') == 'text']
    caption_tracks = [track for track in timeline.get('tracks', []) if track.get('type') == 'caption']
    context = {
        'title': timeline.get('title', project.title),
        'summary': (timeline.get('storyPlan') or {}).get('summary', ''),
        'story_beats': (timeline.get('storyPlan') or {}).get('beats', []),
        'hooks': [{'content': clip.get('content', ''), 'duration': clip.get('duration', 0)} for clip in text_clips[:4]],
        'caption_samples': [segment.get('text', '') for track in caption_tracks for clip in track.get('clips', []) for segment in clip.get('segments', [])[:6]],
        'caption_font_size': next((clip.get('style', {}).get('fontSize') for track in caption_tracks for clip in track.get('clips', [])), 64),
    }
    normalized = prompt.lower()
    quick_edits = []
    if caption_tracks and re.search(r'(كبر|كبّر|اكبر|أكبر|ارفع|زوّد|زود|larger)', normalized) and re.search(r'(كابشن|كلمات|caption)', normalized):
        current_size = float(context['caption_font_size'] or 64)
        quick_edits.append({'type': 'caption_font_size', 'value': min(112, current_size + 8)})
    elif caption_tracks and re.search(r'(صغر|صغّر|اصغر|أصغر|قلل|قلّل|smaller)', normalized) and re.search(r'(كابشن|كلمات|caption)', normalized):
        current_size = float(context['caption_font_size'] or 64)
        quick_edits.append({'type': 'caption_font_size', 'value': max(24, current_size - 8)})
    if caption_tracks and re.search(r'(شفاف|بدون خلفيه|بلا خلفيه|ازاله الخلفيه|ازل الخلفيه|remove background|transparent)', normalized):
        quick_edits.append({'type': 'caption_background', 'value': False})
    elif caption_tracks and re.search(r'(اظهر الخلفيه|اظهر خلفيه|show background)', normalized):
        quick_edits.append({'type': 'caption_background', 'value': True})
    if caption_tracks and re.search(r'(اخف|أخف|اخفي|أخفي|احذف|شيل).*(كابشن|captions)', normalized):
        quick_edits.append({'type': 'captions_hidden', 'value': True})
    if text_clips and re.search(r'(اقصر|أقصر|قصر|قصّر|اختصر|shorter|shorten)', normalized) and re.search(r'(هوك|hook|عنوان)', normalized):
        current_duration = float(min(text_clips, key=lambda item: float(item.get('startTime', 0))).get('duration', 3))
        quick_edits.append({'type': 'hook_duration', 'value': min(2.5, current_duration)})
    hook_match = re.search(r'(?:اجعل|غير|غيّر|بدل|بدّل)\s+(?:عنوان\s+)?(?:الهوك|هوك|hook)\s+(?:الى|إلى|:|：)\s*["«“]?(.*?)["»”]?$' , prompt.strip(), re.IGNORECASE)
    if text_clips and hook_match and hook_match.group(1).strip():
        quick_edits.append({'type': 'hook_text', 'value': hook_match.group(1).strip()[:100]})

    system = (
        "You are an editing director. Return JSON only: {message: Arabic string, edits: array}. "
        "Allowed edits only: {type:'caption_font_size',value:24..112}; {type:'hook_duration',value:0.8..5}; "
        "{type:'hook_text',value:string up to 100 chars}; {type:'captions_hidden',value:boolean}; "
        "{type:'caption_background',value:boolean}. Do not invent clips, transcripts, or unsupported editing operations. "
        "If the user asks for something outside these edits, return edits:[] and explain what is supported in Arabic."
    )
    client = None
    try:
        if quick_edits:
            data = {'message': 'تم تطبيق التعديلات المطلوبة مباشرة على الـTimeline.', 'edits': quick_edits}
        else:
            client = genai.Client(api_key=api_key, http_options=genai_types.HttpOptions(timeout=90000))
            result = None
            last_error = None
            for model_name in ACTIVE_MODELS:
                try:
                    result = client.models.generate_content(
                        model=model_name,
                        contents=[system, f"Project context: {json.dumps(context, ensure_ascii=False)}\nUser request: {prompt}"],
                        config=genai_types.GenerateContentConfig(temperature=0.1),
                    )
                    if result and result.text:
                        break
                except Exception as model_error:
                    last_error = model_error
                    if getattr(model_error, 'code', None) not in (404, 500, 503, 504):
                        raise
            if not result or not result.text:
                raise last_error or RuntimeError('Gemini did not return an edit plan.')
            raw = result.text.strip()
            raw = raw.removeprefix('```json').removeprefix('```').removesuffix('```').strip()
            data = json.loads(raw)
        edits = data.get('edits', [])
        applied = []
        for edit in edits[:5]:
            kind = edit.get('type')
            value = edit.get('value')
            if kind == 'caption_font_size' and caption_tracks:
                size = max(24, min(112, int(value)))
                for track in caption_tracks:
                    for clip in track.get('clips', []):
                        clip.setdefault('style', {})['fontSize'] = size
                applied.append({'type': kind, 'value': size})
            elif kind == 'hook_duration' and text_clips:
                clip = min(text_clips, key=lambda item: float(item.get('startTime', 0)))
                duration = max(0.8, min(5, float(value), float(timeline.get('duration', value))))
                clip['duration'] = duration
                applied.append({'type': kind, 'value': duration})
            elif kind == 'hook_text' and text_clips and isinstance(value, str) and value.strip():
                clip = min(text_clips, key=lambda item: float(item.get('startTime', 0)))
                clip['content'] = value.strip()[:100]
                applied.append({'type': kind, 'value': clip['content']})
            elif kind == 'captions_hidden' and caption_tracks and isinstance(value, bool):
                for track in caption_tracks:
                    track['hidden'] = value
                applied.append({'type': kind, 'value': value})
            elif kind == 'caption_background' and caption_tracks and isinstance(value, bool):
                for track in caption_tracks:
                    for clip in track.get('clips', []):
                        clip.setdefault('style', {})['showBackground'] = value
                        clip['style']['backgroundOpacity'] = 0.72 if value else 0
                applied.append({'type': kind, 'value': value})
        if not applied:
            return Response({'message': data.get('message', 'لم أجد تعديلًا آمنًا مطابقًا للطلب.'), 'timeline': timeline, 'changed': False})
        timeline['updatedAt'] = dj_timezone.now().isoformat()
        project.timeline_json = timeline
        project.title = timeline.get('title', project.title)
        project.duration = timeline.get('duration', project.duration)
        project.save()
        return Response({'message': data.get('message', 'تم تطبيق التعديل على الـTimeline.'), 'timeline': timeline, 'changed': True})
    except Exception as error:
        detail = public_error(error, api_key)
        if getattr(error, 'winerror', None) == 10013 or 'WinError 10013' in str(error):
            detail = 'Windows يمنع اتصال Python بـGemini (WinError 10013). اسمح لـPython بالاتصال عبر جدار الحماية.'
        return Response({'error': detail}, status=502)
    finally:
        if client:
            client.close()


# ══════════════════════════════════════════════════════════════
# MEDIA FILES
# ══════════════════════════════════════════════════════════════

@api_view(['GET'])
def media_list(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    qs = project.media_files.all()
    serializer = MediaFileSerializer(qs, many=True, context={'request': request})
    return Response({'data': serializer.data})


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def media_upload(request, project_id):
    """POST /api/projects/<id>/media/upload/ — upload a media file"""
    project    = get_object_or_404(Project, id=project_id)
    file_obj   = request.FILES.get('file')

    if not file_obj:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    if file_obj.size > 500 * 1024 * 1024:
        return Response({'error': 'File exceeds the 500 MB upload limit.'}, status=400)

    mime_type, _ = mimetypes.guess_type(file_obj.name)
    mime_type     = mime_type or ''
    ext = os.path.splitext(file_obj.name)[1].lower()

    if mime_type.startswith('video') or ext in ['.mp4', '.mov', '.webm', '.avi', '.mkv']:
        media_type = 'video'
    elif mime_type.startswith('audio') or ext in ['.mp3', '.wav', '.aac', '.m4a', '.ogg']:
        media_type = 'audio'
    elif mime_type.startswith('image') or ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
        media_type = 'image'
    else:
        return Response({'error': f'Unsupported file type: {file_obj.name}'}, status=status.HTTP_400_BAD_REQUEST)

    media_file = MediaFile.objects.create(
        project       = project,
        media_type    = media_type,
        status        = 'processing',
        original_name = file_obj.name,
        file          = file_obj,
        size          = file_obj.size,
        mime_type     = mime_type,
    )

    _try_extract_metadata(media_file)
    if media_type in ('video', 'audio') and not media_file.duration:
        media_file.file.delete(save=False)
        media_file.delete()
        return Response({'error': 'تعذر قراءة الملف. ارفع فيديو أو صوتًا صالحًا.'}, status=400)
    media_file.status = 'ready'
    media_file.save()

    return Response(
        {'data': MediaFileSerializer(media_file, context={'request': request}).data},
        status=status.HTTP_201_CREATED,
    )


def _try_extract_metadata(media_file: MediaFile):
    from .media_tools import probe
    try:
        info = probe(media_file.file.path)
        media_file.duration = info.get('duration')
        media_file.video_width = info.get('width')
        media_file.video_height = info.get('height')
        media_file.fps = info.get('fps')
    except (ValueError, OSError):
        media_file.status = 'error'



@api_view(['DELETE'])
def media_delete(request, project_id, media_id):
    project    = get_object_or_404(Project, id=project_id)
    media_file = get_object_or_404(MediaFile, id=media_id, project=project)

    if any(str(clip.get('mediaFileId', '')) == str(media_id)
           for track in (project.timeline_json or {}).get('tracks', []) for clip in track.get('clips', [])):
        return Response({'error': 'احذف مقاطع هذا الملف من التايملاين واحفظ المشروع قبل حذف الميديا.'}, status=409)
    if media_file.file and not MediaFile.objects.filter(file=media_file.file.name).exclude(pk=media_file.pk).exists():
        try:
            os.remove(media_file.file.path)
        except OSError:
            pass

    media_file.delete()
    return Response({'message': 'Media file deleted'}, status=status.HTTP_204_NO_CONTENT)


# ══════════════════════════════════════════════════════════════
# RENDER JOBS
# ══════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
def render_jobs(request, project_id):
    project = get_object_or_404(Project, id=project_id)

    if request.method == 'GET':
        qs = project.render_jobs.all()
        return Response({'data': RenderJobSerializer(qs, many=True).data})

    timeline = request.data.get('timeline') or project.timeline_json
    if not timeline:
        return Response({'error': 'No timeline data. Save the project first.'}, status=status.HTTP_400_BAD_REQUEST)

    render_job = RenderJob.objects.create(
        project           = project,
        resolution        = request.data.get('resolution', '1080x1920'),
        format            = request.data.get('format', 'mp4'),
        fps               = request.data.get('fps', 30),
        timeline_snapshot = timeline,
        status            = 'pending',
    )

    from .render_service import start_render
    start_render(str(render_job.id))

    return Response(
        {'data': RenderJobSerializer(render_job).data},
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
def render_job_status(request, project_id, job_id):
    project    = get_object_or_404(Project, id=project_id)
    render_job = get_object_or_404(RenderJob, id=job_id, project=project)
    return Response({'data': RenderJobSerializer(render_job).data})


# ══════════════════════════════════════════════════════════════
# AI JOBS
# ══════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
def ai_jobs(request, project_id):
    project = get_object_or_404(Project, id=project_id)

    if request.method == 'GET':
        qs = project.ai_jobs.all()
        return Response({'data': AIJobSerializer(qs, many=True).data})

    s = AIJobCreateSerializer(data={**request.data, 'project_id': str(project_id)})
    if not s.is_valid():
        return Response({'error': s.errors}, status=status.HTTP_400_BAD_REQUEST)

    data = s.validated_data
    media_file = get_object_or_404(MediaFile, id=data['media_file_id'], project=project)

    ai_job = AIJob.objects.create(
        project         = project,
        media_file      = media_file,
        job_type        = data.get('job_type', 'full_edit'),
        target_duration = data.get('target_duration', 45),
        language        = data.get('language', 'ar'),
        style           = data.get('style', 'viral'),
        options         = data.get('options', {}),
        status          = 'pending',
    )

    start_ai_job(str(ai_job.id))

    return Response(
        {'data': AIJobSerializer(ai_job).data},
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
def ai_job_status(request, project_id, job_id):
    project = get_object_or_404(Project, id=project_id)
    ai_job  = get_object_or_404(AIJob, id=job_id, project=project)
    return Response({'data': AIJobSerializer(ai_job).data})


# ══════════════════════════════════════════════════════════════
# GLOBAL MEDIA UPLOAD (no project)
# ══════════════════════════════════════════════════════════════

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def global_media_upload(request):
    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
    if file_obj.size > 500 * 1024 * 1024:
        return Response({'error': 'File exceeds the 500 MB upload limit.'}, status=400)

    mime_type, _ = mimetypes.guess_type(file_obj.name)
    mime_type     = mime_type or ''
    ext = os.path.splitext(file_obj.name)[1].lower()

    if mime_type.startswith('video') or ext in ['.mp4', '.mov', '.webm', '.avi']:
        media_type = 'video'
    elif mime_type.startswith('audio') or ext in ['.mp3', '.wav', '.aac', '.m4a']:
        media_type = 'audio'
    elif mime_type.startswith('image') or ext in ['.jpg', '.jpeg', '.png', '.webp']:
        media_type = 'image'
    else:
        return Response({'error': 'Unsupported file type'}, status=status.HTTP_400_BAD_REQUEST)

    media_file = MediaFile.objects.create(
        project       = None,
        media_type    = media_type,
        status        = 'processing',
        original_name = file_obj.name,
        file          = file_obj,
        size          = file_obj.size,
        mime_type     = mime_type,
    )

    _try_extract_metadata(media_file)
    if media_type in ('video', 'audio') and not media_file.duration:
        media_file.file.delete(save=False)
        media_file.delete()
        return Response({'error': 'Could not read media duration. Please check the file and try again.'}, status=400)
    media_file.status = 'ready'
    media_file.save()

    return Response(
        {'data': MediaFileSerializer(media_file, context={'request': request}).data},
        status=status.HTTP_201_CREATED,
    )


# ══════════════════════════════════════════════════════════════
# UNIFIED ONE-SHOT AI REEL GENERATION ENDPOINT
# POST /api/generate-reel/
# ══════════════════════════════════════════════════════════════
from .reel_generator import generate_reel_timeline, parse_prompt

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def generate_reel_view(request):
    """
    POST /api/generate-reel/
    Uploads video file + receives prompt instruction.
    Generates complete ready-to-play Reel with:
    - Silence removal
    - Captions / subtitles
    - Shapes, badges, descriptions and hook banners
    - Saves project and returns immediate editor URL + timeline.
    """
    file_obj = request.FILES.get('video') or request.FILES.get('file')
    media_file_id = request.data.get('media_file_id')
    prompt_text = request.data.get('prompt', 'شيل الفراغات واضف كابشن واشكال وهوك جذاب')
    title = request.data.get('title')
    aspect_ratio = request.data.get('aspect_ratio', '9:16')

    media_file = None

    if file_obj:
        if file_obj.size > 500 * 1024 * 1024 or os.path.splitext(file_obj.name)[1].lower() not in ['.mp4', '.mov', '.webm', '.mkv', '.avi']:
            return Response({'error': 'اختر فيديو صالحًا لا يتجاوز 500 MB.'}, status=400)
        mime_type, _ = mimetypes.guess_type(file_obj.name)
        mime_type = mime_type or 'video/mp4'
        media_file = MediaFile.objects.create(
            media_type='video',
            status='processing',
            original_name=file_obj.name,
            file=file_obj,
            size=file_obj.size,
            mime_type=mime_type,
        )
        _try_extract_metadata(media_file)
        media_file.status = 'ready'
        media_file.save()
    elif media_file_id:
        media_file = get_object_or_404(MediaFile, id=media_file_id)
    else:
        return Response({'error': 'اختر فيديو أولاً.'}, status=400)

    if not media_file.duration:
        return Response({'error': 'تعذر قراءة مدة الفيديو. اختر ملف فيديو صالحًا.'}, status=400)
    try:
        timeline, actions_taken, intents = generate_reel_timeline(media_file, prompt_text, title)
    except ValueError as error:
        return Response({'error': str(error)}, status=422)

    # 1. Create Project
    project = Project.objects.create(
        title=title or f"ريل: {prompt_text[:30]}",
        aspect_ratio=aspect_ratio,
        status='draft',
    )
    if media_file.project_id and media_file.project_id != project.id:
        media_file.pk = None
    media_file.project = project
    media_file.save()

    # 3. Update project record
    timeline['id'] = str(project.id)
    for track in timeline['tracks']:
        for clip in track['clips']:
            if clip['type'] == 'video':
                clip['mediaFileId'] = str(media_file.id)
    project.timeline_json = timeline
    project.duration = timeline['duration']
    project.save()

    # 4. Create AIJob record for tracking
    AIJob.objects.create(
        project=project,
        media_file=media_file,
        job_type='full_edit',
        status='completed',
        progress=100,
        target_duration=int(timeline['duration']),
        options=intents,
        result_timeline=timeline,
        completed_at=dj_timezone.now(),
    )

    frontend_editor_url = f"/editor/{project.id}"

    return Response({
        'status': 'success',
        'message': 'تم توليد الريل بنجاح بناءً على البرومبت 🎬',
        'project_id': str(project.id),
        'editor_url': frontend_editor_url,
        'duration': project.duration,
        'actions_taken': actions_taken,
        'prompt_analysis': intents,
        'timeline': timeline,
    }, status=status.HTTP_201_CREATED)


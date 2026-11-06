"""
API Views — REST endpoints for Reel Studio
"""
import os
import json
import re
import uuid
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

def get_request_user(request):
    """
    Get the authenticated user via Django session or X-User-Email header.
    """
    if request.user and request.user.is_authenticated:
        return request.user

    email = request.headers.get('x-user-email') or request.META.get('HTTP_X_USER_EMAIL')
    if not email and hasattr(request, 'query_params'):
        email = request.query_params.get('user_email')

    if email:
        email = email.strip().lower()
        user = User.objects.filter(email=email).first()
        if not user:
            base_username = email.split('@')[0][:20]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username[:15]}_{counter}"
                counter += 1
            user = User.objects.create(username=username, email=email, first_name=base_username)
            user.set_unusable_password()
            user.save()
        return user
    return None


@api_view(['GET', 'POST'])
def projects_list(request):
    user = get_request_user(request)
    if request.method == 'GET':
        if user:
            qs = Project.objects.filter(user=user)
        else:
            qs = Project.objects.none()
        serializer = ProjectListSerializer(qs, many=True)
        return Response({'data': serializer.data})

    serializer = ProjectSerializer(data=request.data)
    if serializer.is_valid():
        project = serializer.save(user=user)
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
    video_tracks = [track for track in timeline.get('tracks', []) if track.get('type') == 'video']
    context = {
        'title': timeline.get('title', project.title),
        'duration': timeline.get('duration', project.duration),
        'summary': (timeline.get('storyPlan') or {}).get('summary', ''),
        'story_beats': (timeline.get('storyPlan') or {}).get('beats', []),
        'hooks': [{'content': clip.get('content', ''), 'duration': clip.get('duration', 0)} for clip in text_clips[:4]],
        'caption_samples': [segment.get('text', '') for track in caption_tracks for clip in track.get('clips', []) for segment in clip.get('segments', [])[:6]],
        'caption_font_size': next((clip.get('style', {}).get('fontSize') for track in caption_tracks for clip in track.get('clips', [])), 64),
        'available_images': [{'id': str(m.id), 'name': m.original_name} for m in project.media_files.filter(media_type='image')],
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
    if re.search(r'(صورة|صوره|صور|تصميم|تصاميم|انفوجرافيك|image)', normalized) and re.search(r'(قسم|تقسيم|شاشه|شاشة|split|بيشرح|يشرح|شرح|توضح|توضيح)', normalized):
        beats = context.get('story_beats') or []
        first_beat = beats[0] if beats else {}
        hl = first_beat.get('headline') or first_beat.get('description') or context.get('title') or 'أقسام ومفاهيم'
        sub = first_beat.get('stat_label') or 'شرح توضيحي للمحتوى'
        bullets = first_beat.get('stat_value') or ''
        if not bullets and context.get('caption_samples'):
            bullets = ' · '.join(context['caption_samples'][:4])
        quick_edits.append({
            'type': 'add_infographic_image',
            'value': {
                'headline': hl,
                'subtitle': sub,
                'bullets': bullets,
                'startTime': float(first_beat.get('startTime', 0.0)),
                'duration': max(4.5, float(first_beat.get('endTime', 6.0)) - float(first_beat.get('startTime', 0.0))),
                'split_screen': True,
            }
        })

    system = (
        "You are an expert AI Video Editing Director for viral social reels. "
        "Analyze the project context, story beats, duration, and user request, then return JSON only: "
        "{message: Arabic explanation string, edits: array of edit objects}.\n"
        "Allowed edit types:\n"
        "1. {type:'caption_font_size', value: 24..112}\n"
        "2. {type:'hook_duration', value: 0.8..5}\n"
        "3. {type:'hook_text', value: 'نص الهوك الجديد'}\n"
        "4. {type:'captions_hidden', value: true|false}\n"
        "5. {type:'caption_background', value: true|false}\n"
        "6. {type:'add_visual_card', value: {headline: string, stat_value: string (e.g. '85%' or 'نقطة 1 · نقطة 2'), stat_label: string, startTime: float, duration: float, position: 'left'|'right'|'center'|'top'}}\n"
        "   Use position:'top' for a full-width dark top-banner card (top 38% of frame). "
        "Use it when user asks for explainer cards, info banners, visual designs, or lists/classifications.\n"
        "6b. {type:'add_infographic_image', value: {headline: string, subtitle: string, bullets: string, startTime: float, duration: float, split_screen: true}}\n"
        "    Generates a real HD PNG infographic design image with Arabic typography and splits screen with speaker at bottom!\n"
        "7. {type:'split_layout', value: 'side'|'top'|'fullscreen'}\n"
        "8. {type:'add_text_card', value: {content: string, startTime: float, duration: float}}\n"
        "When the user asks to add visual illustrations, designs, info cards, explainers, stats, diagrams or split the reel, "
        "generate appropriate 'add_visual_card' (position:'top' for top banners) and 'split_layout' edits! "
        "Always respond politely in natural Arabic explaining what edits were added to the timeline."
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
        for edit in edits[:6]:
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
            elif kind == 'add_infographic_image':
                val = value if isinstance(value, dict) else edit
                headline = str(val.get('headline') or '').strip()[:90]
                subtitle = str(val.get('subtitle') or val.get('stat_label') or '').strip()[:90]
                bullets = val.get('bullets') or val.get('stat_value') or ''
                if not headline:
                    headline = str(context.get('title') or 'الشرح التوضيحي')[:60]
                start_time = max(0.0, float(val.get('startTime', 0.0)))
                card_duration = max(2.5, min(15.0, float(val.get('duration', 5.5))))

                from .infographic_generator import create_infographic_media_file
                img_media = create_infographic_media_file(
                    project=project,
                    headline=headline,
                    subtitle=subtitle,
                    bullets=bullets,
                    color_mood='gold',
                )
                image_track = next((t for t in timeline.get('tracks', []) if t.get('type') == 'image'), None)
                if not image_track:
                    image_track = {
                        'id': f"track_image_{uuid.uuid4().hex[:6]}",
                        'name': 'الصور والتصاميم',
                        'type': 'image',
                        'order': 1,
                        'muted': False,
                        'locked': False,
                        'hidden': False,
                        'clips': [],
                    }
                    timeline.setdefault('tracks', []).insert(1, image_track)

                img_clip = {
                    'id': f"clip_img_{uuid.uuid4().hex[:6]}",
                    'trackId': image_track['id'],
                    'type': 'image',
                    'mediaFileId': str(img_media.id),
                    'mediaUrl': img_media.file.url,
                    'startTime': start_time,
                    'duration': card_duration,
                    'order': len(image_track.get('clips', [])),
                    'locked': False,
                    'effects': [],
                    'animations': [],
                    'transitions': {
                        'in': {'type': 'fade', 'duration': 0.4, 'easing': 'ease_out'},
                        'out': {'type': 'fade', 'duration': 0.3, 'easing': 'ease_in'},
                    },
                    'transform': {
                        'x': 0,
                        'y': -480,       # Top 50%
                        'width': 100,
                        'height': 50,
                        'rotation': 0,
                        'scaleX': 1, 'scaleY': 1, 'opacity': 1,
                        'cropTop': 0, 'cropBottom': 0, 'cropLeft': 0, 'cropRight': 0,
                    },
                }
                image_track.setdefault('clips', []).append(img_clip)

                if val.get('split_screen', True):
                    for track in timeline.get('tracks', []):
                        if track.get('type') == 'video':
                            for vclip in track.get('clips', []):
                                vt = vclip.setdefault('transform', {})
                                vt['x'] = 0
                                vt['y'] = 480      # Bottom 50%
                                vt['width'] = 100
                                vt['height'] = 50
                                vt['scaleX'] = 1
                                vt['scaleY'] = 1
                applied.append({'type': kind, 'headline': headline, 'media_id': str(img_media.id)})
            elif kind == 'add_visual_card':
                val = value if isinstance(value, dict) else edit
                headline = str(val.get('headline') or '').strip()[:100]
                stat_value = str(val.get('stat_value') or '').strip()[:24]
                stat_label = str(val.get('stat_label') or '').strip()[:70]
                if headline or stat_value:
                    start_time = max(0.0, float(val.get('startTime', 0.0)))
                    card_duration = max(1.5, min(8.0, float(val.get('duration', 3.5))))
                    position = str(val.get('position', 'left')).lower()

                    # top_banner: full-width card at top of frame (like reference image)
                    is_banner = position in ('top', 'top_banner', 'banner')
                    pos_x = 0 if is_banner else (-240 if position == 'left' else (240 if position == 'right' else 0))
                    pos_y = -390 if is_banner else (-30 if position != 'bottom' else 240)
                    card_w  = 100 if is_banner else 46
                    card_h  = 38  if is_banner else 42
                    card_bg_radius = 0 if is_banner else 20
                    card_font_size = 44 if is_banner else (38 if stat_value else 32)
                    card_line_h    = 1.55 if is_banner else 1.35
                    transition_in  = {'type': 'fade', 'duration': 0.4, 'easing': 'ease_out'} if is_banner else \
                                     {'type': 'slide_left' if pos_x <= 0 else 'slide_right', 'duration': 0.35, 'easing': 'ease_out'}

                    # Find or create text track
                    text_track = next((t for t in timeline.get('tracks', []) if t.get('type') == 'text'), None)
                    if not text_track:
                        text_track = {
                            'id': f"track_text_{uuid.uuid4().hex[:6]}",
                            'name': 'الهوك والأشكال',
                            'type': 'text',
                            'muted': False,
                            'locked': False,
                            'hidden': False,
                            'clips': [],
                        }
                        timeline.setdefault('tracks', []).append(text_track)

                    # For top_banner: title → subtitle → bullets order
                    if is_banner:
                        content_parts = [p for p in (headline, stat_label, stat_value) if p]
                    else:
                        stat_chart = ''
                        percent_match = re.search(r'(\d{1,3})\s*%', stat_value)
                        if percent_match:
                            percent = max(0, min(100, int(percent_match.group(1))))
                            filled = min(10, (percent + 5) // 10)
                            stat_chart = '■' * filled + '□' * (10 - filled)
                        content_parts = [p for p in (stat_value, stat_chart, headline, stat_label) if p]

                    new_card = {
                        'id': f"clip_visual_{uuid.uuid4().hex[:6]}",
                        'trackId': text_track['id'],
                        'type': 'text',
                        'content': '\n'.join(content_parts),
                        'startTime': start_time,
                        'duration': card_duration,
                        'order': len(text_track.get('clips', [])),
                        'locked': False,
                        'effects': [],
                        'animations': [],
                        'transitions': {'in': transition_in},
                        'style': {
                            'fontFamily': 'Cairo',
                            'fontSize': card_font_size,
                            'fontWeight': '800',
                            'fontStyle': 'normal',
                            'color': '#FFFFFF',
                            'backgroundColor': '#1A1200' if is_banner else '#1E232A',
                            'backgroundOpacity': 0.93 if is_banner else 0.94,
                            'backgroundPadding': 28 if is_banner else 18,
                            'backgroundBorderRadius': card_bg_radius,
                            'stroke': None if is_banner else {'color': '#06B6D4', 'width': 2},
                            'shadow': {'color': 'rgba(0,0,0,0.6)', 'offsetX': 0, 'offsetY': 4 if is_banner else 8, 'blur': 12 if is_banner else 20},
                            'textAlign': 'center',
                            'lineHeight': card_line_h,
                            'letterSpacing': 0,
                            'direction': 'rtl',
                        },
                        'transform': {
                            'x': pos_x,
                            'y': pos_y,
                            'width': card_w,
                            'height': card_h,
                            'rotation': 0,
                            'scaleX': 1,
                            'scaleY': 1,
                            'opacity': 1,
                            'cropTop': 0,
                            'cropBottom': 0,
                            'cropLeft': 0,
                            'cropRight': 0,
                        },
                    }
                    text_track.setdefault('clips', []).append(new_card)
                    text_clips.append(new_card)
                    applied.append({'type': kind, 'headline': headline})
            elif kind == 'split_layout':
                mode = str(value if isinstance(value, str) else (edit.get('mode') or 'side')).lower()
                video_tracks = [t for t in timeline.get('tracks', []) if t.get('type') == 'video']
                for track in video_tracks:
                    for clip in track.get('clips', []):
                        t = clip.setdefault('transform', {
                            'x': 0, 'y': 0, 'width': 100, 'height': 100,
                            'rotation': 0, 'scaleX': 1, 'scaleY': 1, 'opacity': 1,
                            'cropTop': 0, 'cropBottom': 0, 'cropLeft': 0, 'cropRight': 0
                        })
                        if mode in ('side', 'split_side', 'split'):
                            t['x'] = 180
                            t['width'] = 60
                            t['scaleX'] = 0.95
                            t['scaleY'] = 0.95
                        elif mode in ('top', 'split_top'):
                            t['y'] = -200
                            t['height'] = 60
                            t['scaleX'] = 0.95
                            t['scaleY'] = 0.95
                        elif mode in ('fullscreen', 'reset', 'normal'):
                            t['x'] = 0
                            t['y'] = 0
                            t['width'] = 100
                            t['height'] = 100
                            t['scaleX'] = 1
                            t['scaleY'] = 1
                applied.append({'type': kind, 'value': mode})
            elif kind == 'add_text_card':
                val = value if isinstance(value, dict) else edit
                content = str(val.get('content') or '').strip()[:140]
                if content:
                    start_time = max(0.0, float(val.get('startTime', 0.0)))
                    card_duration = max(1.5, min(8.0, float(val.get('duration', 3.0))))
                    text_track = next((t for t in timeline.get('tracks', []) if t.get('type') == 'text'), None)
                    if not text_track:
                        text_track = {
                            'id': f"track_text_{uuid.uuid4().hex[:6]}",
                            'name': 'الهوك والأشكال',
                            'type': 'text',
                            'muted': False,
                            'locked': False,
                            'hidden': False,
                            'clips': [],
                        }
                        timeline.setdefault('tracks', []).append(text_track)
                    new_card = {
                        'id': f"clip_text_{uuid.uuid4().hex[:6]}",
                        'trackId': text_track['id'],
                        'type': 'text',
                        'content': content,
                        'startTime': start_time,
                        'duration': card_duration,
                        'order': len(text_track.get('clips', [])),
                        'locked': False,
                        'effects': [],
                        'animations': [],
                        'transitions': {'in': {'type': 'fade', 'duration': 0.3, 'easing': 'ease_out'}},
                        'style': {
                            'fontFamily': 'Cairo',
                            'fontSize': 34,
                            'fontWeight': '700',
                            'fontStyle': 'normal',
                            'color': '#FFFFFF',
                            'backgroundColor': '#1E232A',
                            'backgroundOpacity': 0.9,
                            'backgroundPadding': 16,
                            'backgroundBorderRadius': 16,
                            'stroke': {'color': '#10B981', 'width': 1},
                            'shadow': {'color': 'rgba(0,0,0,0.5)', 'offsetX': 0, 'offsetY': 6, 'blur': 16},
                            'textAlign': 'center',
                            'lineHeight': 1.3,
                            'letterSpacing': 0,
                            'direction': 'rtl',
                        },
                        'transform': {
                            'x': 0, 'y': 180, 'width': 65, 'height': 25,
                            'rotation': 0, 'scaleX': 1, 'scaleY': 1, 'opacity': 1,
                            'cropTop': 0, 'cropBottom': 0, 'cropLeft': 0, 'cropRight': 0,
                        },
                    }
                    text_track.setdefault('clips', []).append(new_card)
                    text_clips.append(new_card)
                    applied.append({'type': kind, 'content': content})
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
    # 0. Quota & Subscription check (Run first before heavy file processing)
    user = get_request_user(request)
    sub = None
    if user:
        from .models import UserSubscription
        sub, _ = UserSubscription.objects.get_or_create(user=user, defaults={'plan': 'free', 'video_credits_total': 3})
        if not sub.can_generate:
            return Response({
                'status': 'error',
                'error_code': 'quota_exceeded',
                'message': 'لقد استهلكت رصيد الفيديوهات المتاح لحسابك (3 ريلز مجاناً). يرجى ترقية باقتك للمتابعة والاستمتاع بميزات حصرية.',
                'upgrade_url': '/pricing',
                'quota': {
                    'plan': sub.plan,
                    'plan_name': sub.get_plan_display(),
                    'remaining_credits': 0,
                    'total_credits': sub.video_credits_total,
                    'used_credits': sub.video_credits_used,
                }
            }, status=402)

    file_obj = request.FILES.get('video') or request.FILES.get('file')
    media_file_id = request.data.get('media_file_id')
    prompt_text = request.data.get('prompt', 'شيل الفراغات واضف كابشن واشكال وهوك جذاب')
    title = request.data.get('title')
    aspect_ratio = request.data.get('aspect_ratio', '9:16')
    caption_mode = request.data.get('caption_mode', 'sentence')
    if caption_mode not in ('sentence', 'word_by_word'):
        caption_mode = 'sentence'
    visual_director = str(request.data.get('visual_director', 'true')).lower() not in ('0', 'false', 'no')
    skill_id = request.data.get('skill_id') or request.data.get('skill')
    reference_obj = request.FILES.get('reference_image')

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

    reference_media = None
    if reference_obj:
        reference_ext = os.path.splitext(reference_obj.name)[1].lower()
        if reference_obj.size > 10 * 1024 * 1024 or reference_ext not in ('.png', '.jpg', '.jpeg', '.webp'):
            return Response({'error': 'اختر صورة مرجعية PNG أو JPG أو WebP لا تتجاوز 10 MB.'}, status=400)
        reference_mime, _ = mimetypes.guess_type(reference_obj.name)
        reference_media = MediaFile.objects.create(
            media_type='image',
            status='ready',
            original_name=reference_obj.name,
            file=reference_obj,
            size=reference_obj.size,
            mime_type=reference_mime or 'image/jpeg',
        )

    if not media_file.duration:
        return Response({'error': 'تعذر قراءة مدة الفيديو. اختر ملف فيديو صالحًا.'}, status=400)

    # 1. Create Project first so generated media files attach cleanly
    project = Project.objects.create(
        user=user,
        title=title or f"ريل: {prompt_text[:30]}",
        aspect_ratio=aspect_ratio,
        status='draft',
    )
    if media_file.project_id and media_file.project_id != project.id:
        media_file.pk = None
    media_file.project = project
    media_file.save()
    if reference_media:
        reference_media.project = project
        reference_media.save()

    try:
        timeline, actions_taken, intents = generate_reel_timeline(
            media_file,
            prompt_text,
            title,
            caption_mode=caption_mode,
            reference_image_path=reference_media.file.path if reference_media else None,
            visual_director=visual_director,
            project=project,
            skill_id=skill_id,
        )
    except ValueError as error:
        project.delete()
        if reference_media:
            reference_media.file.delete(save=False)
            reference_media.delete()
        return Response({'error': str(error)}, status=422)

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

    if sub:
        sub.use_credit()

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



# ══════════════════════════════════════════════════════════════
# AUTHENTICATION & GOOGLE SIGN-IN
# ══════════════════════════════════════════════════════════════
from django.contrib.auth import login as dj_login, logout as dj_logout
from django.contrib.auth.models import User

@api_view(['GET'])
def auth_me(request):
    """Returns the current authenticated user session or status."""
    user = get_request_user(request)
    if user:
        from .models import UserSubscription
        sub, _ = UserSubscription.objects.get_or_create(user=user, defaults={'plan': 'free', 'video_credits_total': 3})
        return Response({
            'authenticated': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.first_name or user.username,
                'username': user.username,
                'plan': sub.plan,
                'plan_name': sub.get_plan_display(),
                'remaining_credits': sub.remaining_credits,
                'total_credits': sub.video_credits_total,
                'used_credits': sub.video_credits_used,
                'is_unlimited': sub.is_unlimited,
                'is_staff': user.is_staff or user.is_superuser,
            }
        })
    return Response({'authenticated': False, 'user': None})


@api_view(['POST'])
def auth_google(request):
    """
    Sign in or register with Google.
    Accepts credential (JWT) or direct Google profile {email, name, avatar}.
    """
    import base64
    data = request.data or {}
    email = data.get('email', '').strip().lower()
    name = data.get('name', '').strip()
    avatar = data.get('avatar', '').strip()
    credential = data.get('credential', '').strip()

    if credential and '.' in credential:
        try:
            parts = credential.split('.')
            if len(parts) >= 2:
                payload_b64 = parts[1]
                padded = payload_b64 + '=' * (-len(payload_b64) % 4)
                payload_json = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
                email = payload_json.get('email', email).lower()
                name = payload_json.get('name', name) or payload_json.get('given_name', name)
                avatar = payload_json.get('picture', avatar)
        except Exception:
            pass

    if not email:
        return Response({'status': 'error', 'message': 'البريد الإلكتروني مطلوب لتسجيل الدخول.'}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        base_username = email.split('@')[0][:20]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username[:15]}_{counter}"
            counter += 1

        user = User.objects.create(
            username=username,
            email=email,
            first_name=name or base_username,
        )
        user.set_unusable_password()
        user.save()
    elif name and not user.first_name:
        user.first_name = name
        user.save(update_fields=['first_name'])

    http_req = getattr(request, '_request', request)
    dj_login(http_req, user)
    from .models import UserSubscription
    sub, _ = UserSubscription.objects.get_or_create(user=user, defaults={'plan': 'free', 'video_credits_total': 3})
    return Response({
        'status': 'success',
        'message': f"مرحباً بك، {user.first_name or user.username}! 🎬",
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.first_name or user.username,
            'avatar': avatar,
            'plan': sub.plan,
            'plan_name': sub.get_plan_display(),
            'remaining_credits': sub.remaining_credits,
            'total_credits': sub.video_credits_total,
            'used_credits': sub.video_credits_used,
            'is_unlimited': sub.is_unlimited,
            'is_staff': user.is_staff or user.is_superuser,
        }
    })


@api_view(['POST'])
def auth_login(request):
    """Standard username/password login (e.g. admin / admin)."""
    from django.contrib.auth import authenticate
    data = request.data or {}
    username = (data.get('username') or data.get('email') or '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return Response({'status': 'error', 'message': 'اسم المستخدم وكلمة المرور مطلوبان.'}, status=400)

    http_req = getattr(request, '_request', request)
    user = authenticate(http_req, username=username, password=password)
    if not user:
        matched = User.objects.filter(email__iexact=username).first()
        if matched:
            user = authenticate(http_req, username=matched.username, password=password)

    if not user:
        return Response({'status': 'error', 'message': 'اسم المستخدم أو كلمة المرور غير صحيحة.'}, status=401)
    dj_login(http_req, user)
    from .models import UserSubscription
    sub, _ = UserSubscription.objects.get_or_create(user=user, defaults={'plan': 'free', 'video_credits_total': 3})
    return Response({
        'status': 'success',
        'message': f"مرحباً بك مجدداً، {user.first_name or user.username}! 🎬",
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.first_name or user.username,
            'username': user.username,
            'plan': sub.plan,
            'plan_name': sub.get_plan_display(),
            'remaining_credits': sub.remaining_credits,
            'total_credits': sub.video_credits_total,
            'used_credits': sub.video_credits_used,
            'is_unlimited': sub.is_unlimited or user.is_superuser,
            'is_staff': user.is_staff or user.is_superuser,
        }
    })

@api_view(['POST'])
def auth_logout(request):
    """Logs out the current session."""
    dj_logout(request)
    return Response({'status': 'success', 'message': 'تم تسجيل الخروج بنجاح.'})


@api_view(['POST'])
def auth_update_profile(request):
    """Update profile name."""
    user = get_request_user(request)
    if not user:
        return Response({'status': 'error', 'message': 'غير مسجل الدخول.'}, status=401)

    name = (request.data.get('name') or '').strip()
    if name:
        user.first_name = name
        user.save(update_fields=['first_name'])

    return Response({
        'status': 'success',
        'message': 'تم تحديث بيانات الحساب بنجاح',
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.first_name or user.username,
        }
    })


# ══════════════════════════════════════════════════════════════
# SUBSCRIPTIONS, QUOTAS & PAYMENT RECEIPT CHECKOUT
# ══════════════════════════════════════════════════════════════

@api_view(['GET'])
def subscription_plans(request):
    """Returns available subscription tiers and payment transfer info."""
    plans = [
        {
            'id': 'free',
            'title': 'الباقة المجانية التجريبية',
            'subtitle': 'لتجربة الذكاء الاصطناعي وإنتاج أولى مقاطعك',
            'price_monthly': 0,
            'price_annual': 0,
            'currency': 'ج.م',
            'credits': 3,
            'is_popular': False,
            'badge': 'البداية المجانية',
            'features': [
                {'text': '3 ريلز بالذكاء الاصطناعي مجاناً', 'included': True},
                {'text': 'حذف فترات السكوت تلقائياً', 'included': True},
                {'text': 'كابشن عربي تلقائي', 'included': True},
                {'text': 'جودة تصدير 1080p', 'included': True},
                {'text': 'مخرج بصري وتوليد كروت توضيحية', 'included': True},
                {'text': 'إزالة العلامة المائية', 'included': False},
                {'text': 'أولوية معالجة فورية', 'included': False},
            ],
        },
        {
            'id': 'starter',
            'title': 'Starter',
            'subtitle': 'للنشر الأسبوعي وصناع المحتوى المبتدئين',
            'price_monthly': 190,
            'price_annual': 135,
            'billed_annual_total': 1620,
            'currency': 'EGP',
            'credits': 15,
            'is_popular': False,
            'badge': 'Starter',
            'features': [
                {'text': '15 رصيد شهرياً · 9.00 ج.م للرصيد', 'included': True},
                {'text': 'كابشن ذكي لكل كلمة', 'included': True},
                {'text': 'تخصيص هوية البراند (Brand kits)', 'included': True},
                {'text': 'تعديل وتصدير غير محدود وبدون علامة مائية', 'included': True},
            ],
        },
        {
            'id': 'pro',
            'title': 'Pro Creator',
            'subtitle': 'للنشر المستمر وصناع المحتوى المحترفين',
            'price_monthly': 450,
            'price_annual': 320,
            'billed_annual_total': 3840,
            'currency': 'EGP',
            'credits': 50,
            'is_popular': True,
            'badge': 'الأكثر طلباً ⭐',
            'features': [
                {'text': '50 رصيد شهرياً · 6.40 ج.م للرصيد', 'included': True},
                {'text': 'كل مميزات باقة Starter', 'included': True},
                {'text': 'أولوية معالجة فورية وتصدير فائق السرعة', 'included': True},
                {'text': 'كافة مهارات الإخراج البصري الـ 12 المتقدمة', 'included': True},
                {'text': 'تصدير غير محدود وبدون علامة مائية بجودة 1080p', 'included': True},
            ],
        },
        {
            'id': 'business',
            'title': 'Business & Agencies',
            'subtitle': 'للشركات والوكالات وإدارة الحسابات المتعددة',
            'price_monthly': 890,
            'price_annual': 650,
            'billed_annual_total': 7800,
            'currency': 'EGP',
            'credits': 150,
            'is_popular': False,
            'badge': 'أفضل قيمة',
            'features': [
                {'text': '150 رصيد شهرياً · 4.33 ج.م للرصيد', 'included': True},
                {'text': 'كل مميزات باقة Pro', 'included': True},
                {'text': 'أقل تكلفة للريل الواحد على الإطلاق', 'included': True},
                {'text': 'هويات براند غير محدودة وإدارة فرق عمل', 'included': True},
                {'text': 'أولوية قصوى ودعم فني مخصص', 'included': True},
            ],
        },
    ]

    payment_info = {
        'instapay': {
            'name': 'إنستاباي (InstaPay)',
            'username': 'sekab@instapay',
            'account_holder': 'Amr Ahmed Taher Mohamed',
            'phone': '01023456789',
            'instructions': 'حوّل المبلغ المطلوب عبر تطبيق إنستاباي إلى المعرّف sekab@instapay (الاسم: Amr Ahmed Taher Mohamed)، ثم التقط لقطة شاشة للإيصال وسجّل رقم العملية أدناه.',
        },
        'vodafone_cash': {
            'name': 'فودافون كاش (Vodafone Cash)',
            'number': '01023456789',
            'instructions': 'حوّل مبلغ الباقة إلى رقم المحفظة أعلاه، ثم التقط صورة إيصال التحويل وأرفقها في صفحة الدفع.',
        },
    }

    return Response({
        'status': 'success',
        'plans': plans,
        'payment_info': payment_info,
    })


@api_view(['GET'])
def subscription_my_quota(request):
    """Returns the current user's quota, plan, and orders."""
    user = get_request_user(request)
    if not user:
        return Response({
            'status': 'guest',
            'plan': 'free',
            'plan_name': 'الباقة التجريبية المجانية',
            'remaining_credits': 3,
            'total_credits': 3,
            'used_credits': 0,
            'is_unlimited': False,
            'orders': [],
        })

    from .models import UserSubscription, SubscriptionOrder
    sub, _ = UserSubscription.objects.get_or_create(user=user, defaults={'plan': 'free', 'video_credits_total': 3})
    orders_qs = SubscriptionOrder.objects.filter(user=user)[:5]
    orders_data = [{
        'id': str(o.id),
        'order_number': f"#REEL-{str(o.id)[:6].upper()}",
        'plan_id': o.plan_id,
        'plan_title': o.plan_title,
        'amount': float(o.amount),
        'currency': o.currency,
        'payment_method': o.get_payment_method_display(),
        'sender_phone': o.sender_phone,
        'status': o.status,
        'status_display': o.get_status_display(),
        'receipt_url': request.build_absolute_uri(o.receipt_image.url) if o.receipt_image else None,
        'created_at': o.created_at.isoformat(),
        'approved_at': o.approved_at.isoformat() if o.approved_at else None,
    } for o in orders_qs]

    return Response({
        'status': 'success',
        'plan': sub.plan,
        'plan_name': sub.get_plan_display(),
        'remaining_credits': sub.remaining_credits,
        'total_credits': sub.video_credits_total,
        'used_credits': sub.video_credits_used,
        'is_unlimited': sub.is_unlimited,
        'orders': orders_data,
    })


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def subscription_checkout(request):
    """Creates a pending subscription order with payment receipt."""
    user = get_request_user(request)
    if not user:
        return Response({'status': 'error', 'message': 'يرجى تسجيل الدخول أولاً لإتمام طلب الاشتراك.'}, status=401)

    from .models import SubscriptionOrder
    plan_id = request.data.get('plan_id', 'starter').strip().lower()
    plan_title = request.data.get('plan_title', 'باقة صناع المحتوى').strip()
    amount = request.data.get('amount') or 290.00
    payment_method = request.data.get('payment_method', 'vodafone_cash')
    sender_phone = (request.data.get('sender_phone') or '').strip()
    transaction_ref = (request.data.get('transaction_reference') or '').strip()
    notes = (request.data.get('notes') or '').strip()
    receipt_file = request.FILES.get('receipt')

    if not sender_phone:
        return Response({'status': 'error', 'message': 'يرجى كتابة رقم الهاتف أو المحفظة التي قمت بالتحويل منها.'}, status=400)

    order = SubscriptionOrder.objects.create(
        user=user,
        plan_id=plan_id,
        plan_title=plan_title,
        amount=amount,
        payment_method=payment_method,
        sender_phone=sender_phone,
        transaction_reference=transaction_ref,
        receipt_image=receipt_file,
        notes=notes,
        status='pending',
    )

    return Response({
        'status': 'success',
        'message': 'تم استلام إيصال التحويل بنجاح! سيتم مراجعة الإيصال وتفعيل باقتك في أسرع وقت.',
        'order_id': str(order.id),
        'order_number': f"#REEL-{str(order.id)[:6].upper()}",
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def admin_subscription_orders(request):
    """Lists subscription orders for owner / admin review."""
    from .models import SubscriptionOrder
    status_filter = request.query_params.get('status')
    qs = SubscriptionOrder.objects.all()
    if status_filter:
        qs = qs.filter(status=status_filter)

    orders_data = [{
        'id': str(o.id),
        'order_number': f"#REEL-{str(o.id)[:6].upper()}",
        'user': {
            'id': o.user.id,
            'name': o.user.first_name or o.user.username,
            'email': o.user.email,
        },
        'plan_id': o.plan_id,
        'plan_title': o.plan_title,
        'amount': float(o.amount),
        'currency': o.currency,
        'payment_method': o.get_payment_method_display(),
        'sender_phone': o.sender_phone,
        'transaction_reference': o.transaction_reference,
        'receipt_url': request.build_absolute_uri(o.receipt_image.url) if o.receipt_image else None,
        'notes': o.notes,
        'status': o.status,
        'admin_notes': o.admin_notes,
        'created_at': o.created_at.isoformat(),
        'approved_at': o.approved_at.isoformat() if o.approved_at else None,
    } for o in qs[:50]]

    return Response({
        'status': 'success',
        'total': len(orders_data),
        'orders': orders_data,
    })


@api_view(['POST'])
def admin_order_action(request, order_id):
    """Approve or reject a subscription order."""
    from .models import SubscriptionOrder
    order = get_object_or_404(SubscriptionOrder, id=order_id)
    action = request.data.get('action')
    reason = request.data.get('reason', '')

    if action == 'approve':
        sub = order.approve()
        return Response({
            'status': 'success',
            'message': f'تمت الموافقة وتفعيل {order.plan_title} للمستخدم {order.user.email} بنجاح! 🚀',
            'order_status': order.status,
            'user_remaining_credits': sub.remaining_credits,
        })
    elif action == 'reject':
        order.reject(reason)
        return Response({
            'status': 'success',
            'message': 'تم رفض الطلب.',
            'order_status': order.status,
        })
    return Response({'error': 'Invalid action. Use "approve" or "reject".'}, status=400)



@api_view(['GET'])
def admin_users_list(request):
    """List all registered users for administration."""
    user = get_request_user(request)
    if not user or not (user.is_staff or user.is_superuser):
        return Response({'status': 'error', 'message': 'صلاحيات المدير مطلوبة.'}, status=403)

    from .models import UserSubscription
    users_data = []
    for u in User.objects.all().order_by('-date_joined'):
        sub, _ = UserSubscription.objects.get_or_create(user=u, defaults={'plan': 'free', 'video_credits_total': 3})
        users_data.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'name': u.first_name or u.username,
            'plan': sub.plan,
            'plan_name': sub.get_plan_display(),
            'remaining_credits': sub.remaining_credits,
            'total_credits': sub.video_credits_total,
            'used_credits': sub.video_credits_used,
            'is_unlimited': sub.is_unlimited or u.is_superuser,
            'is_staff': u.is_staff or u.is_superuser,
            'date_joined': u.date_joined.isoformat(),
        })

    return Response({'status': 'success', 'users': users_data})


@api_view(['POST'])
def admin_update_user(request, user_id):
    """Update user subscription, plan, or credits."""
    admin_user = get_request_user(request)
    if not admin_user or not (admin_user.is_staff or admin_user.is_superuser):
        return Response({'status': 'error', 'message': 'صلاحيات المدير مطلوبة.'}, status=403)

    target_user = get_object_or_404(User, id=user_id)
    from .models import UserSubscription
    sub, _ = UserSubscription.objects.get_or_create(user=target_user)

    data = request.data or {}
    new_plan = data.get('plan')
    add_credits = data.get('add_credits')
    set_unlimited = data.get('is_unlimited')

    if new_plan in ('free', 'starter', 'pro', 'business'):
        sub.plan = new_plan

    if add_credits is not None:
        try:
            credits_val = int(add_credits)
            sub.video_credits_total += credits_val
        except (ValueError, TypeError):
            pass

    if set_unlimited is not None:
        sub.is_unlimited = bool(set_unlimited)

    sub.save()
    return Response({
        'status': 'success',
        'message': f"تم تحديث بيانات حساب {target_user.username} بنجاح.",
        'user': {
            'id': target_user.id,
            'username': target_user.username,
            'email': target_user.email,
            'plan': sub.plan,
            'remaining_credits': sub.remaining_credits,
            'is_unlimited': sub.is_unlimited,
        }
    })

"""
Reel Generator Engine — Unified AI Prompt-to-Reel pipeline powered by Google Gemini.
Processes uploaded video + natural language prompt to generate complete reels:
- Transcribes real spoken words and timestamps using Gemini Multimodal AI
- Cuts true silences & pauses (Jump Cuts) based on detected audio gaps
- Generates timed Arabic/English captions with word highlights (Submagic / TikTok style)
- Generates contextual viral hooks and dynamic CTA overlays
- Compiles the final timeline and database records
"""
import uuid
import re
import os
from django.utils import timezone as dj_timezone
from .models import Project, MediaFile, AIJob
from .gemini_service import analyze_video_with_gemini, get_gemini_api_key


def normalize_arabic(text: str) -> str:
    """Normalizes Arabic letters for reliable keyword matching."""
    if not text:
        return ""
    t = text.lower()
    t = re.sub(r'[أإآا]', 'ا', t)
    t = re.sub(r'ة', 'ه', t)
    t = re.sub(r'ى', 'ي', t)
    t = re.sub(r'[\u064B-\u065F]', '', t)  # remove harakat
    return t


def parse_prompt(prompt_text: str):
    """
    Extracts intents and instructions from the user's prompt.
    Supports Arabic & English keywords with normalized matching.
    """
    p = normalize_arabic(prompt_text)

    # Silence removal
    silence_keywords = [
        'فراغ', 'سكوت', 'سكت', 'صمت', 'فاصل', 'فواصل', 'silence', 'cut gap',
        'pause', 'وقف', 'سرع', 'jump cut', 'قص السكوت', 'بدون صوت', 'تفريغ السكوت'
    ]
    remove_silence = any(k in p for k in silence_keywords) or ('شيل' in p and ('صوت' in p or 'سكوت' in p or 'فراغ' in p))

    # Captions
    caption_keywords = [
        'كابشن', 'ترجم', 'نص', 'نصوص', 'كلام', 'تفريغ', 'caption', 'subtitles',
        'submagic', 'كلمات', 'كاريوكي'
    ]
    add_captions = any(k in p for k in caption_keywords)

    # Shapes, Overlays & Hooks
    shape_keywords = [
        'شكل', 'اشكال', 'هوك', 'hook', 'شريط', 'بانر', 'وصف', 'اوصاف',
        'مربع', 'ايقون', 'ايموجي', 'overlay', 'banner', 'ستيكر', 'عنوان', 'بوكس'
    ]
    add_shapes = any(k in p for k in shape_keywords)

    # Style detection
    style = 'viral'
    if 'تعليم' in p or 'educational' in p:
        style = 'educational'
    elif 'بودكاست' in p or 'podcast' in p:
        style = 'podcast'
    elif 'بزنس' in p or 'business' in p:
        style = 'business'
    elif 'احتراف' in p or 'clean' in p:
        style = 'professional'

    # Color mood
    color_mood = 'vivid'
    if 'سينمائي' in p or 'cinematic' in p:
        color_mood = 'cinematic'
    elif 'ابيض' in p or 'b&w' in p:
        color_mood = 'bw'

    return {
        'remove_silence': remove_silence,
        'add_captions': add_captions,
        'add_shapes': add_shapes,
        'style': style,
        'color_mood': color_mood,
    }


def generate_reel_timeline(media_file: MediaFile, prompt_text: str, project_title: str = None, caption_mode: str = 'sentence', reference_image_path: str = None, visual_director: bool = False):
    """
    Creates a full timeline JSON matching the frontend schema based on the prompt.
    Uses Google Gemini Multimodal AI when an API key is available.
    """
    intents = parse_prompt(prompt_text)
    raw_duration = media_file.duration
    if not raw_duration or raw_duration <= 0:
        raise ValueError('تعذر قراءة مدة الفيديو. ارفع ملف فيديو صالحًا.')
    media_url = media_file.file.url if media_file.file else media_file.url
    file_path = media_file.file.path if (media_file.file and os.path.exists(media_file.file.path)) else None

    # Track IDs
    video_track_id = f"track_video_{uuid.uuid4().hex[:6]}"
    text_track_id = f"track_text_{uuid.uuid4().hex[:6]}"
    caption_track_id = f"track_caption_{uuid.uuid4().hex[:6]}"

    actions_taken = []

    gemini_data = None
    if any(intents[k] for k in ('remove_silence', 'add_captions', 'add_shapes')) or visual_director or reference_image_path:
        res = analyze_video_with_gemini(file_path, prompt_text, reference_image_path=reference_image_path)
        if not res.get('success'):
            raise ValueError(res.get('message', 'تعذر تحليل الفيديو.'))
        gemini_data = res
        actions_taken.append(f"تم التحليل بواسطة {res.get('model')}")

    design_style = (gemini_data or {}).get('design_style') or {}
    def design_color(key, fallback):
        value = str(design_style.get(key, ''))
        return value.upper() if re.fullmatch(r'#[0-9A-Fa-f]{6}', value) else fallback

    primary_color = design_color('primaryColor', '#E11D48')
    accent_color = design_color('accentColor', '#8B5CF6')
    caption_color = design_color('captionColor', '#FFFF00')
    card_color = design_color('cardColor', '#111827')
    card_rgb = tuple(int(card_color[index:index + 2], 16) for index in (1, 3, 5))
    card_luminance = (0.2126 * card_rgb[0] + 0.7152 * card_rgb[1] + 0.0722 * card_rgb[2]) / 255
    card_text_color = '#0F172A' if card_luminance > 0.62 else '#FFFFFF'

    # ── 1. Video Track & Silence Cutting ──────────────────────
    video_clips = []
    current_time = 0.0

    # Real silence cutting using Gemini's detected intervals
    if gemini_data and intents['remove_silence'] and gemini_data.get('silence_intervals'):
        silences = sorted(gemini_data['silence_intervals'], key=lambda g: float(g.get('startTime', 0)))
        # Build speech segments by removing silences
        speech_segments = []
        last_speech_start = 0.0

        for gap in silences:
            g_start = max(0, min(raw_duration, float(gap.get('startTime', 0))))
            g_end = max(g_start, min(raw_duration, float(gap.get('endTime', 0))))
            if g_start > last_speech_start + 0.3:
                speech_segments.append((last_speech_start, g_start))
            last_speech_start = max(last_speech_start, g_end)

        if last_speech_start < raw_duration - 0.3:
            speech_segments.append((last_speech_start, raw_duration))

        if not speech_segments:
            speech_segments = [(0.0, raw_duration)]

        for seg_start, seg_end in speech_segments:
            seg_dur = round(seg_end - seg_start, 2)
            if seg_dur <= 0.2:
                continue
            clip_id = f"clip_vid_{uuid.uuid4().hex[:6]}"
            video_clips.append({
                'id': clip_id,
                'trackId': video_track_id,
                'type': 'video',
                'startTime': round(current_time, 2),
                'duration': seg_dur,
                'order': len(video_clips),
                'locked': False,
                'effects': [], 'animations': [], 'transitions': {},
                'mediaFileId': str(media_file.id),
                'mediaUrl': media_url,
                'trimStart': round(seg_start, 2),
                'trimEnd': round(seg_end, 2),
                'volume': 1.0,
                'muted': False,
                'audioFade': {'fadeIn': 0.08, 'fadeOut': 0.08},
                'playbackSpeed': 1.0,
                'colorGrade': {
                    'brightness': 0.05 if intents['color_mood'] == 'vivid' else -0.02,
                    'contrast': 0.15,
                    'saturation': 0.25 if intents['color_mood'] == 'vivid' else 0.0,
                    'hue': 0, 'temperature': 0,
                    'vignette': 0.15 if intents['color_mood'] == 'cinematic' else 0.05,
                },
                'transform': {
                    'x': 0, 'y': 0, 'width': 100, 'height': 100,
                    'rotation': 0, 'scaleX': 1, 'scaleY': 1, 'opacity': 1,
                    'cropTop': 0, 'cropBottom': 0, 'cropLeft': 0, 'cropRight': 0,
                },
            })
            current_time += seg_dur

        cut_saved = round(raw_duration - current_time, 1)
        actions_taken.append(f"✂️ تم قص فترات السكوت الحقيقية المكتشفة بالذكاء الاصطناعي (تم توفير {cut_saved} ثوانٍ بدون صوت).")

    else:
        # Full single video clip
        clip_id = f"clip_vid_{uuid.uuid4().hex[:6]}"
        video_clips.append({
            'id': clip_id,
            'trackId': video_track_id,
            'type': 'video',
            'startTime': 0,
            'duration': raw_duration,
            'order': 0,
            'locked': False,
            'effects': [], 'animations': [], 'transitions': {},
            'mediaFileId': str(media_file.id),
            'mediaUrl': media_url,
            'trimStart': 0,
            'trimEnd': raw_duration,
            'volume': 1.0,
            'muted': False,
            'audioFade': {'fadeIn': 0.15, 'fadeOut': 0.15},
            'playbackSpeed': 1.0,
            'colorGrade': {
                'brightness': 0.04, 'contrast': 0.12, 'saturation': 0.2,
                'hue': 0, 'temperature': 0, 'vignette': 0.1,
            },
            'transform': {
                'x': 0, 'y': 0, 'width': 100, 'height': 100,
                'rotation': 0, 'scaleX': 1, 'scaleY': 1, 'opacity': 1,
                'cropTop': 0, 'cropBottom': 0, 'cropLeft': 0, 'cropRight': 0,
            },
        })
        current_time = raw_duration

    final_total_duration = max(1.0, current_time)

    # ── 2. Dynamic Hook & Shapes ──────────────────────────────
    text_clips = []
    hook_title = "🔥 سر خطير لازم تعرفه!"
    if gemini_data and gemini_data.get('hook_title'):
        hook_title = gemini_data['hook_title']
    elif "سر" in prompt_text:
        hook_title = "💡 سر مخفي لن يخبرك به أحد!"
    elif "طريقة" in prompt_text or "كيف" in prompt_text:
        hook_title = "⚡ أسرع طريقة لتحقيق نتائج مذهلة"

    hook_clip_id = f"clip_hook_{uuid.uuid4().hex[:6]}"
    if intents['add_shapes'] and gemini_data:
        text_clips.append({
            'id': hook_clip_id,
            'trackId': text_track_id,
            'type': 'text',
            'content': hook_title,
            'startTime': 0,
            'duration': min(4.5, final_total_duration),
            'order': 0,
            'locked': False,
            'effects': [], 'animations': [],
            'transitions': {'in': {'type': 'zoom_in', 'duration': 0.4, 'easing': 'ease_out'}},
            'style': {
                'fontFamily': 'Cairo',
                'fontSize': 54,
                'fontWeight': '900',
                'fontStyle': 'normal',
                'color': '#FFFFFF',
                'backgroundColor': primary_color,
                'backgroundOpacity': 0.95,
                'backgroundPadding': 14,
                'backgroundBorderRadius': 12,
                'stroke': {'color': '#000000', 'width': 2},
                'shadow': {'color': 'rgba(0,0,0,0.8)', 'offsetX': 0, 'offsetY': 6, 'blur': 16},
                'textAlign': 'center',
                'lineHeight': 1.3,
                'letterSpacing': 0,
                'direction': 'rtl',
            },
            'transform': {
                'x': 0,
                'y': -620,
                'width': 85,
                'height': 12,
                'rotation': 0,
                'scaleX': 1, 'scaleY': 1, 'opacity': 1,
                'cropTop': 0, 'cropBottom': 0, 'cropLeft': 0, 'cropRight': 0,
            },
        })
        actions_taken.append(f"🎯 تمت إضافة شريط هوك ديناميكي أعلى الفيديو ({hook_title}).")

        # CTA Overlay
        cta_text = "🚀 تابع الحساب للمزيد من الأسرار!"
        if gemini_data and gemini_data.get('cta_text'):
            cta_text = gemini_data['cta_text']

        if intents['add_shapes']:
            cta_clip_id = f"clip_cta_{uuid.uuid4().hex[:6]}"
            cta_start = max(0, final_total_duration - 3.5)
            text_clips.append({
                'id': cta_clip_id,
                'trackId': text_track_id,
                'type': 'text',
                'content': cta_text,
                'startTime': cta_start,
                'duration': final_total_duration - cta_start,
                'order': 1,
                'locked': False,
                'effects': [], 'animations': [],
                'transitions': {'in': {'type': 'slide_left', 'duration': 0.4, 'easing': 'ease_out'}},
                'style': {
                    'fontFamily': 'Cairo',
                    'fontSize': 42,
                    'fontWeight': '700',
                    'fontStyle': 'normal',
                    'color': '#FFFFFF',
                    'backgroundColor': accent_color,
                    'backgroundOpacity': 0.9,
                    'backgroundPadding': 10,
                    'backgroundBorderRadius': 25,
                    'stroke': {'color': '#000000', 'width': 0},
                    'shadow': {'color': 'rgba(0,0,0,0.6)', 'offsetX': 0, 'offsetY': 4, 'blur': 12},
                    'textAlign': 'center',
                    'lineHeight': 1.2,
                    'letterSpacing': 0,
                    'direction': 'rtl',
                },
                'transform': {
                    'x': 0,
                    'y': 520,
                    'width': 80,
                    'height': 10,
                    'rotation': 0,
                    'scaleX': 1, 'scaleY': 1, 'opacity': 1,
                    'cropTop': 0, 'cropBottom': 0, 'cropLeft': 0, 'cropRight': 0,
                },
            })
            actions_taken.append("⭐ تمت إضافة أشكال وعناصر جذب (CTA Badge) في نهاية الريل.")


    # ── 3. Caption Track (Real Gemini Speech Transcription) ────
    caption_clips = []
    if intents['add_captions']:
        cap_clip_id = f"clip_cap_{uuid.uuid4().hex[:6]}"
        segments = []

        if gemini_data:
            for source in gemini_data.get('segments', []):
                for video in video_clips:
                    start = max(float(source['startTime']), video['trimStart'])
                    end = min(float(source['endTime']), video['trimEnd'])
                    if end <= start:
                        continue
                    offset = video['startTime'] - video['trimStart']
                    words = [{**w, 'startTime': max(start, float(w['startTime'])) + offset,
                              'endTime': min(end, float(w['endTime'])) + offset}
                             for w in source.get('words', [])
                             if float(w['endTime']) > start and float(w['startTime']) < end]
                    if words:
                        for word_index in range(0, len(words), 4):
                            line_words = words[word_index:word_index + 4]
                            segments.append({
                                'id': uuid.uuid4().hex,
                                'text': ' '.join(w['word'] for w in line_words),
                                'startTime': line_words[0]['startTime'],
                                'endTime': line_words[-1]['endTime'],
                                'words': line_words,
                            })
                    else:
                        segments.append({
                            'id': uuid.uuid4().hex,
                            'text': source['text'],
                            'startTime': start + offset,
                            'endTime': end + offset,
                            'words': [],
                        })

        caption_clips.append({
            'id': cap_clip_id,
            'trackId': caption_track_id,
            'type': 'caption',
            'startTime': 0,
            'duration': final_total_duration,
            'order': 0,
            'locked': False,
            'effects': [], 'animations': [], 'transitions': {},
            'animationType': caption_mode if caption_mode in ('sentence', 'word_by_word') else 'sentence',
            'segments': segments,
            'style': {
                'preset': 'highlight',
                'fontFamily': 'Cairo',
                'fontSize': 64,
                'fontWeight': '900',
                'fontStyle': 'normal',
                'color': caption_color,
                'backgroundColor': '#000000',
                'backgroundOpacity': 0.75,
                'backgroundPadding': 14,
                'backgroundBorderRadius': 12,
                'stroke': {'color': '#000000', 'width': 3},
                'shadow': {'color': 'rgba(0,0,0,0.9)', 'offsetX': 0, 'offsetY': 6, 'blur': 16},
                'textAlign': 'center',
                'lineHeight': 1.3,
                'letterSpacing': 0,
                'direction': 'rtl',
                'maxWordsPerLine': 4,
                'showBackground': True,
                'animationIn': 'pop',
            },
            'transform': {
                'x': 0,
                'y': 150,
                'width': 92,
                'height': 22,
                'rotation': 0,
                'scaleX': 1, 'scaleY': 1, 'opacity': 1,
                'cropTop': 0, 'cropBottom': 0, 'cropLeft': 0, 'cropRight': 0,
            },
        })

    # ── 4. Visual Director cards ──────────────────────────────
    visual_card_count = 0
    if visual_director and gemini_data:
        for beat_index, beat in enumerate(gemini_data.get('visual_beats', [])[:6]):
            layout = str(beat.get('layout', '')).lower()
            if layout not in ('split_card', 'stat_card'):
                continue
            headline = str(beat.get('headline') or beat.get('description') or '').strip()[:90]
            stat_value = str(beat.get('stat_value') or '').strip()[:24]
            stat_label = str(beat.get('stat_label') or '').strip()[:70]
            if not headline and not stat_value:
                continue
            source_start = max(0.0, float(beat.get('startTime', 0)))
            source_end = max(source_start, float(beat.get('endTime', source_start + 3)))
            for video in video_clips:
                overlap_start = max(source_start, float(video['trimStart']))
                overlap_end = min(source_end, float(video['trimEnd']))
                if overlap_end - overlap_start < 0.35:
                    continue
                offset = float(video['startTime']) - float(video['trimStart'])
                card_start = round(overlap_start + offset, 2)
                card_duration = round(min(5.5, overlap_end - overlap_start), 2)
                stat_chart = ''
                percent_match = re.search(r'(\d{1,3})\s*%', stat_value)
                if percent_match:
                    percent = max(0, min(100, int(percent_match.group(1))))
                    filled = min(10, (percent + 5) // 10)
                    stat_chart = '■' * filled + '□' * (10 - filled)
                content_parts = [part for part in (stat_value, stat_chart, headline, stat_label) if part]
                text_clips.append({
                    'id': f"clip_visual_{uuid.uuid4().hex[:6]}",
                    'trackId': text_track_id,
                    'type': 'text',
                    'content': '\n'.join(content_parts),
                    'startTime': card_start,
                    'duration': card_duration,
                    'order': len(text_clips),
                    'locked': False,
                    'effects': [],
                    'animations': [],
                    'transitions': {'in': {'type': 'slide_left' if beat_index % 2 else 'slide_right', 'duration': 0.35, 'easing': 'ease_out'}},
                    'style': {
                        'fontFamily': 'Cairo',
                        'fontSize': 40 if stat_value else 34,
                        'fontWeight': '800',
                        'fontStyle': 'normal',
                        'color': card_text_color,
                        'backgroundColor': card_color,
                        'backgroundOpacity': 0.92,
                        'backgroundPadding': 18,
                        'backgroundBorderRadius': 22,
                        'stroke': {'color': accent_color, 'width': 1},
                        'shadow': {'color': 'rgba(0,0,0,0.55)', 'offsetX': 0, 'offsetY': 8, 'blur': 20},
                        'textAlign': 'center',
                        'lineHeight': 1.35,
                        'letterSpacing': 0,
                        'direction': 'rtl',
                    },
                    'transform': {
                        'x': -250 if beat_index % 2 else 250,
                        'y': -40,
                        'width': 44,
                        'height': 42,
                        'rotation': 0,
                        'scaleX': 1,
                        'scaleY': 1,
                        'opacity': 1,
                        'cropTop': 0,
                        'cropBottom': 0,
                        'cropLeft': 0,
                        'cropRight': 0,
                    },
                })
                visual_card_count += 1
                break
        if visual_card_count:
            actions_taken.append(f"تم إنشاء {visual_card_count} مشاهد توضيحية جانبية مرتبطة بالكلام.")

    # ── Final Timeline Assemble ───────────────────────────────
    tracks = [
        {
            'id': video_track_id,
            'type': 'video',
            'name': 'الفيديو الأصلي',
            'order': 0,
            'locked': False, 'muted': False, 'hidden': False,
            'clips': video_clips,
        },
        {
            'id': text_track_id,
            'type': 'text',
            'name': 'الهوك والأشكال',
            'order': 1,
            'locked': False, 'muted': False, 'hidden': False,
            'clips': text_clips,
        },
        {
            'id': caption_track_id,
            'type': 'caption',
            'name': 'كابشن تلقائي',
            'order': 2,
            'locked': False, 'muted': False, 'hidden': False,
            'clips': caption_clips,
        },
    ]

    story_beats = []
    for beat in (gemini_data or {}).get('visual_beats', []):
        source_start = max(0.0, float(beat.get('startTime', 0)))
        source_end = max(source_start, float(beat.get('endTime', source_start)))
        for video in video_clips:
            overlap_start = max(source_start, float(video['trimStart']))
            overlap_end = min(source_end, float(video['trimEnd']))
            if overlap_end <= overlap_start:
                continue
            offset = float(video['startTime']) - float(video['trimStart'])
            story_beats.append({
                'startTime': round(overlap_start + offset, 2),
                'endTime': round(overlap_end + offset, 2),
                'description': str(beat.get('description', 'لحظة من الفيديو'))[:180],
                'layout': str(beat.get('layout', 'full'))[:30],
                'headline': str(beat.get('headline', ''))[:90],
                'statValue': str(beat.get('stat_value', ''))[:24],
                'statLabel': str(beat.get('stat_label', ''))[:70],
            })

    title = project_title or (f"ريل {gemini_data['hook_title'][:25]}" if gemini_data and gemini_data.get('hook_title') else f"ريل ذكي — {prompt_text[:28]}..." if prompt_text else "ريل احترافي جديد")

    timeline_json = {
        'id': str(uuid.uuid4()),
        'version': 2,
        'title': title,
        'duration': round(final_total_duration, 2),
        'fps': 30,
        'width': 1080,
        'height': 1920,
        'tracks': tracks,
        'storyPlan': {
            'summary': str((gemini_data or {}).get('summary', ''))[:500],
            'beats': story_beats,
        },
        'globalAudio': {'masterVolume': 1.0},
        'settings': {
            'backgroundColor': '#000000',
            'brandKit': {
                'primaryColor': primary_color,
                'secondaryColor': accent_color,
                'fontFamily': 'Cairo',
            },
            'exportPreset': {
                'resolution': '1080x1920',
                'width': 1080, 'height': 1920,
                'fps': 30, 'codec': 'h264',
                'videoBitrate': 8000, 'audioBitrate': 192,
                'format': 'mp4',
            },
        },
        'updatedAt': dj_timezone.now().isoformat(),
    }

    return timeline_json, actions_taken, intents

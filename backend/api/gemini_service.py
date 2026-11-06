"""
Gemini Pro Audio/Video AI Service — Real Speech Transcription, Silence Detection & Viral Hooks.
Integrates Google Gemini (2.0 / 1.5 Pro / Flash) with the Reel Generator pipeline.
"""
import os
import json
import mimetypes
import time
import subprocess
import tempfile
from pathlib import Path
import imageio_ffmpeg
from google import genai
from google.genai import types

KEY_FILE = Path(__file__).resolve().parent.parent / '.gemini_key'


def get_gemini_api_key() -> str:
    """Retrieves the Gemini API key from environment, local file, or .env."""
    key = os.environ.get('GEMINI_API_KEY', '').strip()
    if key:
        return key

    if KEY_FILE.exists():
        try:
            stored = KEY_FILE.read_text(encoding='utf-8').strip()
            if stored:
                os.environ['GEMINI_API_KEY'] = stored
                return stored
        except Exception:
            pass

    return ''


def save_gemini_api_key(api_key: str) -> bool:
    """Saves the Gemini API key to local file and updates the current process environment."""
    key = api_key.strip()
    if not key:
        return False
    try:
        KEY_FILE.write_text(key, encoding='utf-8')
        os.environ['GEMINI_API_KEY'] = key
        return True
    except Exception:
        return False


ACTIVE_MODELS = list(dict.fromkeys([
    os.environ.get('GEMINI_MODEL', 'gemini-3.1-flash-lite'),
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
]))

def public_error(error, key=''):
    code = getattr(error, 'code', None)
    if code in (401, 403):
        return 'رفض Google صلاحية المفتاح. راجع قيود المفتاح وتفعيل Gemini API في Google AI Studio.'
    if code == 503:
        return 'خدمة Gemini مشغولة مؤقتًا. حاول مرة أخرى بعد قليل.'
    if code == 504:
        return 'انتهت مهلة تحليل الفيديو. جرّب فيديو أقصر أو حاول مرة أخرى.'
    if code == 429:
        return 'تم تجاوز حصة Gemini أو حد الطلبات. راجع الحصة والفوترة في Google AI Studio ثم حاول لاحقًا.'
    if code == 400:
        return 'رفض Google الطلب أو المفتاح. تأكد من نسخ مفتاح Gemini API كاملًا من Google AI Studio.'
    return str(error).replace(key, '[REDACTED]') if key else str(error)


def test_gemini_key(api_key: str) -> dict:
    """Verifies that the provided API key works with Google Gemini."""
    last_err = ''
    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=30000))

    for model_name in ACTIVE_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents='Hello, reply with OK'
            )
            if response and response.text:
                client.close()
                return {'valid': True, 'model': model_name}
        except Exception as e:
            last_err = public_error(e, api_key)
            if getattr(e, 'code', None) not in (404, 500, 503, 504):
                break

    client.close()
    return {'valid': False, 'error': last_err or 'No response received from Gemini'}


def extract_audio(video_path: str) -> str:
    """
    Extracts a lightweight MP3 audio track from the video file using imageio-ffmpeg.
    Returns path to temporary MP3 file.
    """
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    out_file = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
    out_path = out_file.name
    out_file.close()

    cmd = [
        ffmpeg_exe,
        '-y',
        '-i', video_path,
        '-vn',              # no video
        '-acodec', 'libmp3lame',
        '-ac', '1',
        '-b:a', '64k',      # keep inline Gemini audio requests compact
        '-ar', '44100',
        out_path
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True, timeout=120)
        return out_path
    except Exception:
        return ''


SKILL_GEMINI_DIRECTIVES = {
    'doros_online': (
        "توجيه إخراج خاص: نمط «دروس أونلاين» (Doros Online):\n"
        "- الفيديو سيكون مقسوماً: المتحدث في بطاقة محددة أسفل الشاشة، والنصف العلوي كروت إنفوجرافيك وشروحات.\n"
        "- اختر layout: 'top_banner' دائماً للحظات الشرح المهمة مع وضع headline للعنوان الرئيسي ونقاط مفصولة بـ ' · ' في stat_value.\n"
        "- اجعل الألوان: primaryColor: '#EAB308', captionColor: '#FDE047', cardColor: '#FFFDF7'."
    ),
    'glass_animation': (
        "توجيه إخراج خاص: نمط «الزجاج البلوري السينمائي» (Glass Animation):\n"
        "- بطاقات زجاجية بلورية تطفو عند الكلمات المفتاحية وأهم عبارة تلخص الفكرة.\n"
        "- اختر layout: 'stat_card' مع عبارات مضيئة بالأزرق السماوي.\n"
        "- اجعل الألوان: primaryColor: '#38BDF8', captionColor: '#38BDF8', cardColor: '#0F172A'."
    ),
    'show_the_proof': (
        "توجيه إخراج خاص: نمط «إثبات النتائج والدليل الحي» (Show the Proof):\n"
        "- ركز بشدة على استخراج الأرقام والإحصائيات والنسب المئوية والنتائج المادية.\n"
        "- ضع في stat_value أرقاماً واضحة مع علامة % ومؤشرات بصرية في stat_card.\n"
        "- اجعل الألوان: primaryColor: '#10B981', captionColor: '#34D399', cardColor: '#064E3B'."
    ),
    'product_in_action': (
        "توجيه إخراج خاص: نمط «استعراض المنتج أثناء العمل» (Product in Action):\n"
        "- قسّم اللحظات إلى 3 أجزاء واضحة: المشكلة -> التجربة/النقر -> النتيجة.\n"
        "- اختر layout: 'top_banner' لشرح ميزة المنتج وخطوات الحل.\n"
        "- اجعل الألوان: primaryColor: '#6366F1', captionColor: '#A5B4FC', cardColor: '#1E1B4B'."
    ),
    'step_by_step_tutorial': (
        "توجيه إخراج خاص: نمط «شرح تعليمي خطوة بخطوة 1-2-3» (Step-by-Step Tutorial):\n"
        "- قسّم المحتوى لخطوات مرقمة متسلسلة (خطوة 1، خطوة 2، خطوة 3).\n"
        "- اختر layout: 'top_banner' لكل خطوة جديدة مع عنوان الخطوة والنقاط التنفيذية.\n"
        "- اجعل الألوان: primaryColor: '#3B82F6', captionColor: '#93C5FD', cardColor: '#1E293B'."
    ),
    'quick_tips': (
        "توجيه إخراج خاص: نمط «نصائح سريعة وخاطفة» (Quick Tips):\n"
        "- استخرج كل نصيحة سريعة في stat_card مع وضع رقم النصيحة وعنوانها.\n"
        "- اجعل الألوان: primaryColor: '#F59E0B', captionColor: '#FCD34D', cardColor: '#292524'."
    ),
    'big_bold_words': (
        "توجيه إخراج خاص: نمط «كلمات ضخمة حركية» (Big Bold Words):\n"
        "- ركز على استخراج الكلمات القوية ذات التأثير النفسي في الهوك والكابشن.\n"
        "- اجعل الألوان: primaryColor: '#F43F5E', captionColor: '#FDE047', cardColor: '#000000'."
    ),
    'calm_expert': (
        "توجيه إخراج خاص: نمط «خبير هادئ وواثق» (Calm Expert):\n"
        "- احتفظ بفواصل الكلام الطبيعية، ولا تقص الوقفات التأملية.\n"
        "- ركز على كابشن جمل كاملة هادئة ورصينة.\n"
        "- اجعل الألوان: primaryColor: '#D97706', captionColor: '#FFFFFF', cardColor: '#1E293B'."
    ),
    'before_and_after': (
        "توجيه إخراج خاص: نمط «مقارنة التحول - قبل وبعد» (Before and After):\n"
        "- استخرج الفارق الجوهري بين الوضع السابق (قبل) والوضع الحالي أو النتيجة (بعد).\n"
        "- اختر layout: 'top_banner' لمقارنة الأرقام والنتائج.\n"
        "- اجعل الألوان: primaryColor: '#10B981', captionColor: '#34D399', cardColor: '#0F172A'."
    ),
    'illustrated_explainer': (
        "توجيه إخراج خاص: نمط «مخططات ورسومات توضيحية» (Illustrated Explainer):\n"
        "- حوّل المفاهيم المجردة إلى عناصر ومحاور بصرية وعلاقات سببية.\n"
        "- اختر layout: 'top_banner' لكل مفهوم مع النقاط الفرعية.\n"
        "- اجعل الألوان: primaryColor: '#0EA5E9', captionColor: '#7DD3FC', cardColor: '#0C1929'."
    ),
    'personal_story': (
        "توجيه إخراج خاص: نمط «قصة شخصية وتجربة ملهمة» (Personal Story):\n"
        "- حدد محطات القصة: البداية والتحدي ثم نقطة التحول والدرس المستفاد.\n"
        "- اجعل الألوان: primaryColor: '#F59E0B', captionColor: '#FEF08A', cardColor: '#1C1917'."
    ),
    'field_notes': (
        "توجيه إخراج خاص: نمط «ملاحظات ميدانية وتوثيق عملي» (Field Notes):\n"
        "- استخرج الملاحظات الميدانية والواقعية المباشرة التي ذكرها المتحدث.\n"
        "- اختر layout: 'top_banner' لعرض الملاحظات في كروت كالمفكرة.\n"
        "- اجعل الألوان: primaryColor: '#264D40', captionColor: '#FDE047', cardColor: '#FAFAF9'."
    ),
}


def analyze_video_with_gemini(video_path: str, prompt_text: str = '', reference_image_path: str = None, skill_id: str = None) -> dict:
    """Analyze both the picture and the speech for a directed short-form edit."""
    api_key = get_gemini_api_key()
    if not api_key:
        return {'success': False, 'error': 'NO_API_KEY',
                'message': 'يرجى إدخال مفتاح Gemini API Key لتفعيل التحليل.'}

    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=600000))
    uploaded_video = None
    try:
        source = Path(video_path)
        mime_type = mimetypes.guess_type(source.name)[0] or 'video/mp4'
        if source.stat().st_size <= 18 * 1024 * 1024:
            video_content = types.Part.from_bytes(data=source.read_bytes(), mime_type=mime_type)
        else:
            uploaded_video = client.files.upload(file=video_path)
            deadline = time.monotonic() + 300
            while getattr(getattr(uploaded_video, 'state', None), 'name', '') == 'PROCESSING' and time.monotonic() < deadline:
                time.sleep(2)
                uploaded_video = client.files.get(name=uploaded_video.name)
            if getattr(getattr(uploaded_video, 'state', None), 'name', '') == 'FAILED':
                raise RuntimeError('تعذر تجهيز ملف الفيديو لدى Gemini. جرّب ملفًا أصغر أو بصيغة MP4.')
            video_content = uploaded_video

        reference_content = None
        if reference_image_path:
            reference = Path(reference_image_path)
            reference_mime = mimetypes.guess_type(reference.name)[0] or 'image/jpeg'
            reference_content = types.Part.from_bytes(data=reference.read_bytes(), mime_type=reference_mime)

        normalized_skill = (skill_id or '').strip().lower().replace('-', '_')
        skill_instruction = SKILL_GEMINI_DIRECTIVES.get(normalized_skill, '')

        system_instruction = (
            "أنت مخرج ريلز عربي محترف. شاهد الفيديو واسمع صوته كاملًا، ولا تخترع أي كلام أو مشاهد.\n"
            "فرّغ الكلام العربي كلمة بكلمة مع توقيت كل كلمة والجمل، واكتشف فقط فترات الصمت الواضحة الأطول من 0.3 ثانية.\n"
            f"{skill_instruction + chr(10) if skill_instruction else ''}"
            "صف 3 إلى 6 لحظات مرئية فعلية بتوقيتها لاستخدامها كخطة مشاهد.\n"
            "لكل visual beat اختر layout مناسبًا:\n"
            "  - top_banner: كارت عرضي كامل في أعلى الشاشة (يغطي 35-40% من الأعلى) يظهر عنوانًا كبيرًا وعنوانًا فرعيًا ونقاطًا. استخدمه للمقاطع التعليمية والتفسيرية حين يذكر المتحدث قائمة أو تعريفًا أو عناصر مرتبة. مثال: حين يقول 'أقسام الحديث هي: مرفوع وموقوف ومقطوع' → top_banner بعنوان 'أقسام الحديث النبوي' ونقاط 'مرفوع · موقوف · مقطوع'.\n"
            "  - stat_card: بطاقة رقمية صغيرة للإحصائيات والأرقام المذكورة فعليًا.\n"
            "  - split_card: تقسيم جانبي للتعريفات القصيرة.\n"
            "لا تضف عناصر تخفي وجه المتحدث (top_banner يظهر فوق الوجه في الأعلى وهذا مقبول).\n"
            "في headline: ضع العنوان الرئيسي الكبير. في stat_label: ضع العنوان الفرعي. في stat_value: ضع النقاط مفصولة بـ ' · '.\n"
            "إذا أُرفقت صورة بعد الفيديو فهي مرجع تصميم فقط: استخرج منها لوحة ألوان واضحة.\n"
            "أعد JSON فقط بالشكل: {segments:[{text,startTime,endTime,words:[{word,startTime,endTime}]}],"
            "silence_intervals:[{startTime,endTime}],visual_beats:[{startTime,endTime,description,layout,headline,stat_value,stat_label}],"
            "design_style:{primaryColor,accentColor,captionColor,cardColor},hook_title,cta_text,summary}. جميع الأوقات بالثواني من بداية المصدر."
        )
        user_content = (
            f"طلب صاحب الفيديو: {prompt_text or 'احذف التوقفات الواضحة، أضف كابشن عربي دقيق، وخطة مشاهد وهوك مناسب.'}\n"
            "اجعل الفيديو عمودي 9:16 في التحرير، ولا تقص أي جملة منطوقة."
        )
        last_error = None
        for model_name in ACTIVE_MODELS:
            for attempt in range(2):
                try:
                    contents = [video_content]
                    if reference_content:
                        contents.append(reference_content)
                    contents.append(user_content)
                    response = client.models.generate_content(
                        model=model_name, contents=contents,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            response_mime_type='application/json', temperature=0.2,
                        ),
                    )
                    if response and response.text:
                        raw = response.text.strip()
                        raw = raw.removeprefix('```json').removeprefix('```').removesuffix('```').strip()
                        data = json.loads(raw)
                        return {
                            'success': True, 'model': model_name,
                            'segments': data.get('segments', []),
                            'silence_intervals': data.get('silence_intervals', []),
                            'visual_beats': data.get('visual_beats', []),
                            'design_style': data.get('design_style', {}),
                            'hook_title': data.get('hook_title', ''),
                            'cta_text': data.get('cta_text', ''),
                            'summary': data.get('summary', ''),
                        }
                except Exception as ex:
                    last_error = ex
                    code = getattr(ex, 'code', None)
                    if code in (503, 429) and attempt == 0:
                        time.sleep(2.5)
                        continue
                    if code not in (404, 500, 503, 504, 429):
                        raise
                    break
        raise last_error or RuntimeError('تعذر الحصول على استجابة من نماذج Gemini المتوفرة.')
    except Exception as error:
        detail = public_error(error, api_key)
        winerror = getattr(error, 'winerror', None) or getattr(error, 'errno', None)
        if winerror == 10013 or 'WinError 10013' in str(error):
            detail = 'Windows يمنع اتصال Python بخدمة Gemini (WinError 10013). اسمح لـ Python بالوصول للإنترنت في جدار الحماية ثم أعد المحاولة.'
        return {'success': False, 'error': detail, 'message': f'فشل تحليل الفيديو بواسطة Gemini: {detail}'}
    finally:
        if uploaded_video:
            try:
                client.files.delete(name=uploaded_video.name)
            except Exception:
                pass
        client.close()

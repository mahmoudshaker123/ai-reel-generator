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
    'gemini-3.5-flash',
    'gemini-3.8-flash',
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


def analyze_video_with_gemini(video_path: str, prompt_text: str = '') -> dict:
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

        system_instruction = (
            "أنت مخرج ريلز عربي. شاهد الفيديو واسمع صوته كاملًا، ولا تخترع أي كلام أو مشاهد.\n"
            "فرّغ الكلام العربي كلمة بكلمة مع توقيت كل كلمة والجمل، واكتشف فقط فترات الصمت الواضحة الأطول من 0.3 ثانية.\n"
            "صف 3 إلى 6 لحظات مرئية فعلية بتوقيتها لاستخدامها كخطة مشاهد. اقترح hook وCTA مطابقين للمحتوى، ولا تضف عناصر تخفي وجه المتحدث.\n"
            "أعد JSON فقط بالشكل: {segments:[{text,startTime,endTime,words:[{word,startTime,endTime}]}],"
            "silence_intervals:[{startTime,endTime}],visual_beats:[{startTime,endTime,description}],"
            "hook_title,cta_text,summary}. جميع الأوقات بالثواني من بداية المصدر."
        )
        user_content = (
            f"طلب صاحب الفيديو: {prompt_text or 'احذف التوقفات الواضحة، أضف كابشن عربي دقيق، وخطة مشاهد وهوك مناسب.'}\n"
            "اجعل الفيديو عمودي 9:16 في التحرير، ولا تقص أي جملة منطوقة."
        )
        last_error = None
        for model_name in ACTIVE_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name, contents=[video_content, user_content],
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type='application/json', temperature=0.2,
                    ),
                )
                if response and response.text:
                    data = json.loads(response.text.strip())
                    return {
                        'success': True, 'model': model_name,
                        'segments': data.get('segments', []),
                        'silence_intervals': data.get('silence_intervals', []),
                        'visual_beats': data.get('visual_beats', []),
                        'hook_title': data.get('hook_title', ''),
                        'cta_text': data.get('cta_text', ''),
                        'summary': data.get('summary', ''),
                    }
            except Exception as ex:
                last_error = ex
                if getattr(ex, 'code', None) not in (404, 500, 503, 504):
                    raise
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

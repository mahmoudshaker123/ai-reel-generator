"""
Gemini Pro Audio/Video AI Service — Real Speech Transcription, Silence Detection & Viral Hooks.
Integrates Google Gemini (2.0 / 1.5 Pro / Flash) with the Reel Generator pipeline.
"""
import os
import json
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
    """
    Uses Gemini Pro / Flash Multimodal AI to transcribe spoken Arabic audio word-by-word,
    detect silent pauses, and generate viral hook titles and CTAs.
    """
    api_key = get_gemini_api_key()
    if not api_key:
        return {
            'success': False,
            'error': 'NO_API_KEY',
            'message': 'يرجى إدخال مفتاح Gemini API Key لتفعيل الذكاء الاصطناعي الحقيقي لتفريغ الصوت بدقة.'
        }

    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=120000))

    # 1. Extract audio for faster upload & high transcription accuracy
    audio_path = extract_audio(video_path)
    audio_file_uploaded = None

    try:
        if not audio_path:
            raise ValueError('تعذر استخراج الصوت. تأكد أن الفيديو يحتوي على مسار صوتي صالح.')

        # 3. Formulate structured prompt
        system_instruction = (
            "أنت محرر فيديو ذكي وخبير في صناعة الريلز التفاعلية (TikTok & Instagram Reels).\n"
            "مهمتك هي الاستماع للصوت المسجل بدقة عالية جداً باللغة العربية (سواء كانت فصحى أو عامية مصرية أو خليجية).\n"
            "قم بتفريغ كل الكلمات المنطوقة بدقة مع تحديد توقيت البداية والنهاية لكل كلمة وكل جملة.\n"
            "قم أيضاً باكتشاف أي فترات سكوت أو توقف عن الكلام (Silence Gaps) تزيد عن 0.3 ثانية لقصها.\n"
            "اختر عنوان هوك (Hook) مثير في أعلى الفيديو يناسب موضوع الكلام تماماً، وجملة دعوة للتفاعل (CTA).\n"
            "يجب أن تكون الإجابة بصيغة JSON فقط متطابقة مع المخطط التالي:\n"
            "{\n"
            '  "segments": [\n'
            '    {\n'
            '      "text": "النص الكامل للجملة بالعربية",\n'
            '      "startTime": 0.0,\n'
            '      "endTime": 2.5,\n'
            '      "words": [\n'
            '        {"word": "الكلمة", "startTime": 0.0, "endTime": 0.4}\n'
            '      ]\n'
            '    }\n'
            '  ],\n'
            '  "silence_intervals": [\n'
            '    {"startTime": 2.5, "endTime": 3.1}\n'
            '  ],\n'
            '  "hook_title": "عنوان هوك جذاب ومثير من صلب الموضوع",\n'
            '  "cta_text": "جملة ختامية مناسبة للموضوع",\n'
            '  "summary": "ملخص لمحتوى الفيديو"\n'
            "}"
        )

        user_content = f"طلب المستخدم الإضافي: {prompt_text if prompt_text else 'استخرج الكابشن بدقة واكتشف فترات الصمت'}"

        # 4. Generate content with structured JSON
        response = None
        used_model = ACTIVE_MODELS[0]

        for model_name in ACTIVE_MODELS:
            try:
                audio_content = None
                if Path(audio_path).stat().st_size <= 18 * 1024 * 1024:
                    audio_content = types.Part.from_bytes(
                        data=Path(audio_path).read_bytes(),
                        mime_type='audio/mpeg',
                    )
                else:
                    if not audio_file_uploaded:
                        audio_file_uploaded = client.files.upload(file=audio_path)
                    audio_content = audio_file_uploaded
                response = client.models.generate_content(
                    model=model_name,
                    contents=[audio_content, user_content],
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type='application/json',
                        temperature=0.2,
                    )
                )
                if response and response.text:
                    used_model = model_name
                    break
            except Exception as ex:
                last_error = ex
                if getattr(ex, 'code', None) not in (404, 500, 503, 504):
                    raise

        if not response or not response.text:
            raise last_error if 'last_error' in locals() else RuntimeError('تعذر الحصول على استجابة من نماذج Gemini المتوفرة.')

        raw_json = response.text.strip()
        data = json.loads(raw_json)

        return {
            'success': True,
            'model': used_model,
            'segments': data.get('segments', []),
            'silence_intervals': data.get('silence_intervals', []),
            'hook_title': data.get('hook_title', ''),
            'cta_text': data.get('cta_text', ''),
            'summary': data.get('summary', ''),
        }

    except Exception as e:
        return {
            'success': False,
            'error': public_error(e, api_key),
            'message': f'فشل تحليل الفيديو بواسطة Gemini: {public_error(e, api_key)}'
        }
    finally:
        # Clean up temporary audio file
        if audio_path != video_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass
        # Clean up uploaded Gemini file if exists
        if audio_file_uploaded:
            try:
                client.files.delete(name=audio_file_uploaded.name)
            except Exception:
                pass

        client.close()

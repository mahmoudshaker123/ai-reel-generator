"""Check the locally configured credential without printing it."""
import json
import urllib.request
import urllib.error
from pathlib import Path

key = (Path(__file__).resolve().parents[1] / 'backend/.gemini_key').read_text().strip()
request = urllib.request.Request(
    'https://generativelanguage.googleapis.com/v1beta/models',
    headers={'x-goog-api-key': key},
)
try:
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.load(response)
        print(json.dumps({'status': response.status, 'models': [m['name'] for m in data.get('models', []) if 'generateContent' in m.get('supportedGenerationMethods', [])]}))
except urllib.error.HTTPError as error:
    data = json.load(error)
    print(json.dumps({'status': error.code, 'message': data.get('error', {}).get('message', '').replace(key, '[REDACTED]')}))

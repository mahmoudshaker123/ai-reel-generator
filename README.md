# Reel Studio AI

Arabic-first AI reel editor for turning video into short-form content. It includes a timeline editor, synchronized preview, Gemini-assisted cuts and captions, and FFmpeg export.

## Requirements

- Node.js 20.9 or later and npm
- Python 3.10+
- Internet access for Gemini

FFmpeg is provided through the Python imageio-ffmpeg dependency.

## Local setup (Windows)

1. Copy `.env.example` to `.env.local`. The frontend proxies `/api` requests to Django at `http://127.0.0.1:8001`.
2. Install frontend packages with `npm install`, then run `npm run dev`.
3. In another terminal, install `backend/requirements.txt` in a Python virtual environment and run `start-backend.bat`. Django listens on port 8001.
4. Open `http://localhost:3000`. Add a Gemini key through the key dialog; it is stored locally in the ignored `backend/.gemini_key` file.

The backend creates a local SQLite database and uploaded media under `backend/`. Keep these files private. For deployment, set `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false`, and `ALLOWED_HOSTS`; configure persistent media storage, TLS, and the Gemini key in the hosting environment.

## Useful commands

```bash
npm run lint
npm run build
```

Backend integration checks use synthetic video and audio only:

```bash
python backend/manage.py test api.tests
```

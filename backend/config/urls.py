"""
URL Configuration for Reel Studio Backend
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse, HttpResponseRedirect, HttpResponse
from api.media_tools import serve_media


def root_view(request):
    # If opened directly in browser, redirect to Next.js frontend UI
    accept = request.META.get('HTTP_ACCEPT', '')
    if 'text/html' in accept:
        return HttpResponseRedirect('http://localhost:3000/')

    return JsonResponse({
        'service': 'Reel Studio AI Engine',
        'version': '2.0.0',
        'status': 'online',
        'frontend_url': 'http://localhost:3000/',
        'unified_endpoint': '/api/generate-reel/',
        'endpoints': {
            'health': '/api/health/',
            'generate_reel': '/api/generate-reel/',
            'projects': '/api/projects/',
            'media_upload': '/api/media/upload/',
            'gemini_key': '/api/settings/gemini-key/',
            'admin': '/admin/',
        },
        'message': 'Welcome to Reel Studio API. Ready to process reels with Gemini Pro!'
    })


urlpatterns = [
    path('', root_view, name='root'),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('media/<path:path>', serve_media),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

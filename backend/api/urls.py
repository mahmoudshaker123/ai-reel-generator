"""
URL Patterns for the API app
"""
from django.urls import path
from . import views

urlpatterns = [
    # ── Unified One-Shot AI Reel Generator ─────────────────────
    path('generate-reel/', views.generate_reel_view, name='generate-reel'),

    # ── Health ─────────────────────────────────────────────────
    path('health/', views.health_check, name='health'),

    # ── Projects ───────────────────────────────────────────────
    path('projects/', views.projects_list, name='projects-list'),
    path('projects/<uuid:project_id>/', views.project_detail, name='project-detail'),
    path('projects/<uuid:project_id>/timeline/', views.save_timeline, name='save-timeline'),

    # ── Media (project-scoped) ─────────────────────────────────
    path('projects/<uuid:project_id>/media/', views.media_list, name='media-list'),
    path('projects/<uuid:project_id>/media/upload/', views.media_upload, name='media-upload'),
    path('projects/<uuid:project_id>/media/<uuid:media_id>/', views.media_delete, name='media-delete'),

    # ── Render Jobs ────────────────────────────────────────────
    path('projects/<uuid:project_id>/render/', views.render_jobs, name='render-jobs'),
    path('projects/<uuid:project_id>/render/<uuid:job_id>/', views.render_job_status, name='render-job-status'),

    # ── AI Jobs ────────────────────────────────────────────────
    path('projects/<uuid:project_id>/ai/', views.ai_jobs, name='ai-jobs'),
    path('projects/<uuid:project_id>/ai/<uuid:job_id>/', views.ai_job_status, name='ai-job-status'),

    # ── Global upload (no project needed) ─────────────────────
    path('media/upload/', views.global_media_upload, name='global-media-upload'),

    # ── Gemini Pro Key Settings ────────────────────────────────
    path('settings/gemini-key/', views.gemini_key_settings, name='gemini-key-settings'),
]


"""
URL Patterns for the API app
"""
from django.urls import path
from . import views

urlpatterns = [
    # ── Unified One-Shot AI Reel Generator ─────────────────────
    path('generate-reel/', views.generate_reel_view, name='generate-reel'),
    path('projects/<uuid:project_id>/director/', views.director_edit, name='director-edit'),

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
    # ── Authentication & Google Sign-In ────────────────────────
        path('auth/login/', views.auth_login, name='auth-login'),
    path('admin/users/', views.admin_users_list, name='admin-users-list'),
    path('admin/users/<int:user_id>/update/', views.admin_update_user, name='admin-update-user'),
    path('auth/me/', views.auth_me, name='auth-me'),
    path('auth/google/', views.auth_google, name='auth-google'),
    path('auth/profile/', views.auth_update_profile, name='auth-profile'),
    path('auth/logout/', views.auth_logout, name='auth-logout'),

    # ── Subscriptions, Plans & Checkout ────────────────────────
    path('subscriptions/plans/', views.subscription_plans, name='subscription-plans'),
    path('subscriptions/my-quota/', views.subscription_my_quota, name='subscription-my-quota'),
    path('subscriptions/checkout/', views.subscription_checkout, name='subscription-checkout'),
    path('subscriptions/admin/orders/', views.admin_subscription_orders, name='admin-orders'),
    path('subscriptions/admin/orders/<uuid:order_id>/action/', views.admin_order_action, name='admin-order-action'),
]


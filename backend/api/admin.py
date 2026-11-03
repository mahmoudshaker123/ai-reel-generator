from django.contrib import admin
from .models import Project, MediaFile, RenderJob, AIJob


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display  = ['title', 'status', 'aspect_ratio', 'duration', 'updated_at']
    list_filter   = ['status', 'aspect_ratio']
    search_fields = ['title']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(MediaFile)
class MediaFileAdmin(admin.ModelAdmin):
    list_display  = ['original_name', 'media_type', 'status', 'size', 'created_at']
    list_filter   = ['media_type', 'status']
    search_fields = ['original_name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(RenderJob)
class RenderJobAdmin(admin.ModelAdmin):
    list_display  = ['project', 'status', 'progress', 'resolution', 'format', 'created_at']
    list_filter   = ['status', 'format']
    readonly_fields = ['id', 'created_at', 'completed_at']


@admin.register(AIJob)
class AIJobAdmin(admin.ModelAdmin):
    list_display  = ['project', 'job_type', 'style', 'status', 'progress', 'created_at']
    list_filter   = ['status', 'job_type', 'style', 'language']
    readonly_fields = ['id', 'created_at', 'completed_at']

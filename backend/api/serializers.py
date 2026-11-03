"""
Serializers — Convert Django models ↔ JSON (matching frontend types)
"""
from rest_framework import serializers
from .models import Project, MediaFile, RenderJob, AIJob


class MediaFileSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model  = MediaFile
        fields = [
            'id', 'project', 'media_type', 'status',
            'original_name', 'url', 'thumbnail_url',
            'size', 'mime_type',
            'duration', 'video_width', 'video_height', 'fps', 'codec',
            'sample_rate', 'channels',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'url']

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.file:
            return obj.file.url
        return obj.url or ''


class ProjectSerializer(serializers.ModelSerializer):
    media_files = MediaFileSerializer(many=True, read_only=True)

    class Meta:
        model  = Project
        fields = [
            'id', 'title', 'description', 'status', 'aspect_ratio',
            'duration', 'fps', 'width', 'height', 'thumbnail_url',
            'timeline_json', 'media_files',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views (no timeline JSON)"""
    class Meta:
        model  = Project
        fields = [
            'id', 'title', 'description', 'status', 'aspect_ratio',
            'duration', 'fps', 'width', 'height', 'thumbnail_url',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RenderJobSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RenderJob
        fields = [
            'id', 'project', 'status', 'progress', 'output_url',
            'error_message', 'resolution', 'format', 'fps',
            'created_at', 'completed_at',
        ]
        read_only_fields = ['id', 'created_at', 'completed_at', 'output_url', 'progress', 'status']


class AIJobSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AIJob
        fields = [
            'id', 'project', 'media_file', 'status', 'job_type', 'progress',
            'target_duration', 'language', 'style', 'options',
            'transcript_json', 'editing_plan_json', 'result_timeline',
            'error_message', 'created_at', 'completed_at',
        ]
        read_only_fields = [
            'id', 'status', 'progress', 'transcript_json',
            'editing_plan_json', 'result_timeline',
            'error_message', 'created_at', 'completed_at',
        ]


class MediaUploadSerializer(serializers.Serializer):
    """Used for file upload endpoint"""
    file       = serializers.FileField()
    project_id = serializers.UUIDField(required=False, allow_null=True)


class AIJobCreateSerializer(serializers.Serializer):
    """Used to start an AI job"""
    project_id      = serializers.UUIDField()
    media_file_id   = serializers.UUIDField()
    job_type        = serializers.ChoiceField(
        choices=['full_edit', 'transcription_only', 'highlight_detection', 'caption_gen'],
        default='full_edit',
    )
    target_duration = serializers.IntegerField(default=45)
    language        = serializers.ChoiceField(choices=['ar', 'en', 'ar-en'], default='ar')
    style           = serializers.ChoiceField(
        choices=['viral', 'educational', 'professional', 'podcast', 'business'],
        default='viral',
    )
    options         = serializers.DictField(child=serializers.BooleanField(), default=dict)


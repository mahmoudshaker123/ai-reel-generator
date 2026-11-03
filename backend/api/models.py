"""
API Models — Database schema for Reel Studio
"""
import uuid
from django.db import models
from django.contrib.auth.models import User


def media_upload_path(instance, filename):
    """Upload path: media/<project_id>/<filename>"""
    return f'uploads/{instance.project_id or "global"}/{filename}'


# ─── Project ──────────────────────────────────────────────────
class Project(models.Model):
    STATUS_CHOICES = [
        ('draft',     'Draft'),
        ('rendering', 'Rendering'),
        ('completed', 'Completed'),
        ('failed',    'Failed'),
    ]
    ASPECT_RATIO_CHOICES = [
        ('9:16', 'TikTok / Reels (9:16)'),
        ('16:9', 'YouTube (16:9)'),
        ('1:1',  'Square (1:1)'),
        ('4:5',  'Instagram (4:5)'),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # In dev mode, no auth required. userId is optional.
    user         = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='projects')
    title        = models.CharField(max_length=255, default='مشروع جديد')
    description  = models.TextField(blank=True, default='')
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    aspect_ratio = models.CharField(max_length=10, choices=ASPECT_RATIO_CHOICES, default='9:16')
    duration     = models.FloatField(default=0)   # seconds
    fps          = models.IntegerField(default=30)
    width        = models.IntegerField(default=1080)
    height       = models.IntegerField(default=1920)
    thumbnail_url= models.URLField(blank=True, default='')

    # The full timeline JSON (serialized Project type from frontend)
    timeline_json = models.JSONField(default=dict, blank=True)

    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.title} ({self.id})'


# ─── Media File ───────────────────────────────────────────────
class MediaFile(models.Model):
    TYPE_CHOICES = [
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('image', 'Image'),
    ]
    STATUS_CHOICES = [
        ('uploading',  'Uploading'),
        ('processing', 'Processing'),
        ('ready',      'Ready'),
        ('error',      'Error'),
    ]

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project       = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, related_name='media_files')
    user          = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    media_type    = models.CharField(max_length=10, choices=TYPE_CHOICES)
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploading')
    original_name = models.CharField(max_length=255)
    file          = models.FileField(upload_to=media_upload_path, blank=True)
    url           = models.CharField(max_length=512, blank=True)  # full URL
    thumbnail_url = models.CharField(max_length=512, blank=True)
    size          = models.BigIntegerField(default=0)  # bytes
    mime_type     = models.CharField(max_length=100, blank=True)

    # Video / Audio metadata
    duration      = models.FloatField(null=True, blank=True)
    video_width   = models.IntegerField(null=True, blank=True)
    video_height  = models.IntegerField(null=True, blank=True)
    fps           = models.FloatField(null=True, blank=True)
    codec         = models.CharField(max_length=50, blank=True)
    sample_rate   = models.IntegerField(null=True, blank=True)
    channels      = models.IntegerField(null=True, blank=True)

    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_name} [{self.media_type}]'


# ─── Render Job ───────────────────────────────────────────────
class RenderJob(models.Model):
    STATUS_CHOICES = [
        ('pending',    'Pending'),
        ('processing', 'Processing'),
        ('completed',  'Completed'),
        ('failed',     'Failed'),
        ('cancelled',  'Cancelled'),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project      = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='render_jobs')
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress     = models.IntegerField(default=0)   # 0-100
    output_url   = models.CharField(max_length=512, blank=True)
    error_message= models.TextField(blank=True)
    resolution   = models.CharField(max_length=20, default='1080x1920')
    format       = models.CharField(max_length=10, default='mp4')
    fps          = models.IntegerField(default=30)
    # The timeline snapshot used for this render
    timeline_snapshot = models.JSONField(default=dict, blank=True)

    created_at   = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'RenderJob({self.project_id}) [{self.status}]'


# ─── AI Job ───────────────────────────────────────────────────
class AIJob(models.Model):
    TYPE_CHOICES = [
        ('full_edit',           'Full Edit'),
        ('transcription_only',  'Transcription Only'),
        ('highlight_detection', 'Highlight Detection'),
        ('caption_gen',         'Caption Generation'),
    ]
    STATUS_CHOICES = [
        ('pending',      'Pending'),
        ('transcribing', 'Transcribing'),
        ('analyzing',    'Analyzing'),
        ('editing',      'Editing'),
        ('completed',    'Completed'),
        ('failed',       'Failed'),
    ]
    STYLE_CHOICES = [
        ('viral',        'Viral'),
        ('educational',  'Educational'),
        ('professional', 'Professional'),
        ('podcast',      'Podcast'),
        ('business',     'Business'),
    ]
    LANGUAGE_CHOICES = [
        ('ar',    'Arabic'),
        ('en',    'English'),
        ('ar-en', 'Arabic + English'),
    ]

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project          = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='ai_jobs')
    media_file       = models.ForeignKey(MediaFile, on_delete=models.CASCADE, related_name='ai_jobs')
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    job_type         = models.CharField(max_length=30, choices=TYPE_CHOICES, default='full_edit')
    progress         = models.IntegerField(default=0)   # 0-100
    target_duration  = models.IntegerField(default=45)  # seconds
    language         = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default='ar')
    style            = models.CharField(max_length=20, choices=STYLE_CHOICES, default='viral')

    # Options (JSON booleans)
    options          = models.JSONField(default=dict, blank=True)

    # Results
    transcript_json  = models.JSONField(null=True, blank=True)   # [{word, start, end, confidence}]
    editing_plan_json= models.JSONField(null=True, blank=True)   # EditingPlan type
    result_timeline  = models.JSONField(null=True, blank=True)   # Generated timeline JSON

    error_message    = models.TextField(blank=True)

    created_at       = models.DateTimeField(auto_now_add=True)
    completed_at     = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'AIJob({self.job_type}) [{self.status}]'

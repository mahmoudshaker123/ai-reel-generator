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


# ─── User Subscription & Quota ─────────────────────────────────
class UserSubscription(models.Model):
    PLAN_CHOICES = [
        ('free',    'الباقة التجريبية المجانية'),
        ('starter', 'باقة صناع المحتوى (Starter)'),
        ('pro',     'باقة المحترف (Pro Creator)'),
        ('agency',  'باقة الوكالات والإنتاج (Agency)'),
    ]

    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user                = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan                = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    video_credits_total = models.IntegerField(default=3)   # Free starts with 3 reels
    video_credits_used  = models.IntegerField(default=0)
    is_unlimited        = models.BooleanField(default=False)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    @property
    def remaining_credits(self):
        if self.is_unlimited:
            return 999999
        return max(0, self.video_credits_total - self.video_credits_used)

    @property
    def can_generate(self):
        return self.is_unlimited or self.remaining_credits > 0

    def use_credit(self):
        if not self.is_unlimited:
            self.video_credits_used += 1
            self.save(update_fields=['video_credits_used', 'updated_at'])

    def __str__(self):
        return f"{self.user.username} - {self.get_plan_display()} ({self.remaining_credits} credits left)"


# ─── Subscription Order & Payment Receipt ────────────────────
class SubscriptionOrder(models.Model):
    STATUS_CHOICES = [
        ('pending',  'قيد المراجعة (Pending)'),
        ('approved', 'تمت الموافقة والتفعيل (Approved)'),
        ('rejected', 'مرفوض (Rejected)'),
    ]
    PAYMENT_METHODS = [
        ('vodafone_cash', 'فودافون كاش (Vodafone Cash)'),
        ('instapay',      'إنستاباي (InstaPay)'),
        ('bank_transfer', 'تحويل بنكي (Bank Transfer)'),
    ]

    id                    = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user                  = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscription_orders')
    plan_id               = models.CharField(max_length=20)  # starter, pro, agency
    plan_title            = models.CharField(max_length=100)
    amount                = models.DecimalField(max_digits=10, decimal_places=2)
    currency              = models.CharField(max_length=10, default='EGP')
    payment_method        = models.CharField(max_length=30, choices=PAYMENT_METHODS, default='vodafone_cash')
    sender_phone          = models.CharField(max_length=50) # Transfer phone / wallet
    transaction_reference = models.CharField(max_length=100, blank=True, default='')
    receipt_image         = models.ImageField(upload_to='receipts/%Y/%m/', blank=True, null=True)
    notes                 = models.TextField(blank=True, default='')
    status                = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_notes           = models.TextField(blank=True, default='')
    created_at            = models.DateTimeField(auto_now_add=True)
    updated_at            = models.DateTimeField(auto_now=True)
    approved_at           = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def approve(self, admin_user=None):
        from django.utils import timezone
        self.status = 'approved'
        self.approved_at = timezone.now()
        self.save(update_fields=['status', 'approved_at', 'updated_at'])

        # Update or create user subscription
        sub, _ = UserSubscription.objects.get_or_create(user=self.user)
        sub.plan = self.plan_id
        if self.plan_id == 'starter':
            sub.is_unlimited = False
            sub.video_credits_total = sub.video_credits_used + 30
        elif self.plan_id == 'pro':
            sub.is_unlimited = False
            sub.video_credits_total = sub.video_credits_used + 100
        elif self.plan_id == 'agency':
            sub.is_unlimited = True
        sub.save()
        return sub

    def reject(self, reason=''):
        self.status = 'rejected'
        self.admin_notes = reason
        self.save(update_fields=['status', 'admin_notes', 'updated_at'])

    def __str__(self):
        return f"Order #{str(self.id)[:8]} - {self.user.username} - {self.plan_title} ({self.status})"

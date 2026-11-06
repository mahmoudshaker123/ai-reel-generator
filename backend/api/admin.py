from django.contrib import admin
from django.utils.html import format_html
from .models import Project, MediaFile, RenderJob, AIJob, UserSubscription, SubscriptionOrder


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'video_credits_total', 'video_credits_used', 'remaining_credits', 'is_unlimited', 'updated_at']
    list_filter = ['plan', 'is_unlimited']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(SubscriptionOrder)
class SubscriptionOrderAdmin(admin.ModelAdmin):
    list_display = ['id_short', 'user', 'plan_title', 'amount', 'payment_method', 'sender_phone', 'status', 'receipt_preview', 'created_at']
    list_filter = ['status', 'plan_id', 'payment_method']
    search_fields = ['user__username', 'user__email', 'sender_phone', 'transaction_reference']
    readonly_fields = ['id', 'created_at', 'updated_at', 'approved_at', 'receipt_preview']
    actions = ['approve_orders', 'reject_orders']

    def id_short(self, obj):
        return f"#{str(obj.id)[:8]}"
    id_short.short_description = 'Order ID'

    def receipt_preview(self, obj):
        if obj.receipt_image:
            return format_html('<a href="{0}" target="_blank"><img src="{0}" width="60" height="60" style="object-fit:cover;border-radius:6px;border:1px solid #ccc;"/></a>', obj.receipt_image.url)
        return "لا يوجد إيصال"
    receipt_preview.short_description = 'صورة الإيصال'

    @admin.action(description='✅ الموافقة على الطلبات المختارة وتفعيل الباقة')
    def approve_orders(self, request, queryset):
        count = 0
        for order in queryset:
            order.approve()
            count += 1
        self.message_user(request, f'تم تفعيل باقات {count} طلب بنجاح.')

    @admin.action(description='❌ رفض الطلبات المختارة')
    def reject_orders(self, request, queryset):
        queryset.update(status='rejected')
        self.message_user(request, 'تم رفض الطلبات المختارة.')


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

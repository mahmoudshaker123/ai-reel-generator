'use client';
import { useState } from 'react';
import { X, User, Settings2, Sparkles, Check, Loader2, Video, Sliders, ShieldCheck } from 'lucide-react';
import { useAuthStore, type CreatorPreferences } from '@/stores/authStore';
import { apiAuth } from '@/lib/api';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectCount?: number;
  onRefreshProjects?: () => void;
}

export function AccountSettingsModal({
  isOpen,
  onClose,
  projectCount = 0,
  onRefreshProjects,
}: AccountSettingsModalProps) {
  const { user, updateUser, preferences, updatePreferences } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [captionMode, setCaptionMode] = useState<CreatorPreferences['captionMode']>(preferences.captionMode);
  const [visualDirector, setVisualDirector] = useState(preferences.visualDirector);
  const [aspectRatio, setAspectRatio] = useState<CreatorPreferences['aspectRatio']>(preferences.aspectRatio);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSavedSuccess(false);

    try {
      if (displayName.trim() && displayName !== user?.name) {
        const res = await apiAuth.updateProfile({ name: displayName.trim() });
        updateUser({ name: res.user.name });
      }

      // Save creator studio preferences
      updatePreferences({
        captionMode,
        visualDirector,
        aspectRatio,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.76)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#14171F',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
        dir="rtl"
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#C4B5FD',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: 8, padding: '3px 8px',
                fontSize: 11, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <Settings2 size={12} />
                إعدادات الحساب
              </span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>
              تفضيلات صانع المحتوى
            </h2>
            <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: '4px 0 0' }}>
              تخصيص بياناتك وتفضيلات الذكاء الاصطناعي الافتراضية لصناعة الفيديوهات.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              background: 'transparent', border: 0, color: '#9CA3AF',
              cursor: 'pointer', padding: 6, borderRadius: 8,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 12, color: '#F87171',
          }}>
            {error}
          </div>
        )}

        {/* Profile Card Banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: 14,
        }}>
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`}
            alt=""
            style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{user.name}</span>
              <span style={{
                background: '#10B98122', color: '#34D399', fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3,
              }}>
                <ShieldCheck size={11} /> موثق
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF', direction: 'ltr', textAlign: 'right' }}>
              {user.email}
            </p>
          </div>
          <div style={{
            background: '#1F2937', borderRadius: 8, padding: '6px 10px',
            textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#F3F4F6', fontFamily: 'monospace' }}>
              {projectCount}
            </div>
            <div style={{ fontSize: 10, color: '#9CA3AF' }}>مشاريعك</div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Section 1: Display Name */}
          <div>
            <label style={{ fontSize: 12, color: '#D1D5DB', marginBottom: 6, display: 'block', fontWeight: 600 }}>
              اسم العرض الخاص بك:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: '#0D0F14',
                  color: '#fff', fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Section 2: AI & Studio Defaults */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: 14,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#E5E7EB' }}>
              <Sliders size={14} color="#8B5CF6" />
              <span>تفضيلات الذكاء الاصطناعي الافتراضية</span>
            </div>

            {/* Caption Mode */}
            <div>
              <span style={{ fontSize: 11.5, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>
                طريقة ظهور الكابشن التلقائي:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setCaptionMode('sentence')}
                  style={{
                    padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', border: '1px solid',
                    background: captionMode === 'sentence' ? 'rgba(139, 92, 246, 0.2)' : '#12151D',
                    borderColor: captionMode === 'sentence' ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                    color: captionMode === 'sentence' ? '#C4B5FD' : '#9CA3AF',
                  }}
                >
                  سطر كامل (هادئ وواضح)
                </button>
                <button
                  type="button"
                  onClick={() => setCaptionMode('word_by_word')}
                  style={{
                    padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', border: '1px solid',
                    background: captionMode === 'word_by_word' ? 'rgba(139, 92, 246, 0.2)' : '#12151D',
                    borderColor: captionMode === 'word_by_word' ? '#8B5CF6' : 'rgba(255,255,255,0.1)',
                    color: captionMode === 'word_by_word' ? '#C4B5FD' : '#9CA3AF',
                  }}
                >
                  كلمة بكلمة (تيك توك وديناميكي)
                </button>
              </div>
            </div>

            {/* Visual Director Toggle */}
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', borderRadius: 8, background: '#12151D',
              border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#E5E7EB' }}>
                  تفعيل المخرج البصري التلقائي
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                  توليد صور وكروت توضيحية وتقسيم الشاشة تلقائياً بحسب المحتوى
                </div>
              </div>
              <input
                type="checkbox"
                checked={visualDirector}
                onChange={(e) => setVisualDirector(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#8B5CF6', cursor: 'pointer' }}
              />
            </label>

            {/* Aspect Ratio */}
            <div>
              <span style={{ fontSize: 11.5, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>
                أبعاد الفيديو الافتراضية:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { id: '9:16', label: '9:16 ريلز / تيك توك' },
                  { id: '16:9', label: '16:9 يوتيوب أفقي' },
                  { id: '1:1',  label: '1:1 مربع' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAspectRatio(item.id as CreatorPreferences['aspectRatio'])}
                    style={{
                      padding: '8px 6px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', border: '1px solid', textAlign: 'center',
                      background: aspectRatio === item.id ? 'rgba(16, 185, 129, 0.15)' : '#12151D',
                      borderColor: aspectRatio === item.id ? '#10B981' : 'rgba(255,255,255,0.1)',
                      color: aspectRatio === item.id ? '#34D399' : '#9CA3AF',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#fff', border: 0, borderRadius: 10,
                  padding: '10px 20px', fontSize: 13, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                <span>حفظ التفضيلات</span>
              </button>
              {savedSuccess && (
                <span style={{ fontSize: 12, color: '#34D399', fontWeight: 600 }}>
                  ✓ تم الحفظ بنجاح!
                </span>
              )}
            </div>

            {onRefreshProjects && (
              <button
                type="button"
                onClick={() => {
                  onRefreshProjects();
                  onClose();
                }}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#9CA3AF', borderRadius: 8, padding: '8px 12px', fontSize: 11.5,
                  cursor: 'pointer',
                }}
              >
                تحديث مشاريع الحساب
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}


'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Mail, CheckCircle2, Key, ShieldCheck, HelpCircle, ExternalLink, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiAuth } from '@/lib/api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (listener?: any) => void;
        };
      };
    };
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { login } = useAuthStore();
  const [authMode, setAuthMode] = useState<'user' | 'admin'>('user');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [clientId, setClientId] = useState<string>('');
  const [inputClientId, setInputClientId] = useState('');
  const [clientSavedNotice, setClientSavedNotice] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Initialize client ID from env or localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const envId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const storedId = localStorage.getItem('reel_studio_google_client_id') || '';
    const active = envId || storedId;
    setClientId(active);
    setInputClientId(active);
  }, [isOpen]);

  // Initialize official Google Identity Services (GIS) when clientId is present
  useEffect(() => {
    if (!isOpen || !clientId) return;

    let mounted = true;
    const initGoogle = () => {
      if (!mounted || typeof window === 'undefined' || !window.google?.accounts?.id) return;
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) return;
            setLoading(true);
            setError('');
            try {
              const res = await apiAuth.googleLogin({
                credential: response.credential,
              });
              login(res.user);
              onSuccess?.();
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'فشل التحقق من حساب Google عبر الخادم');
            } finally {
              setLoading(false);
            }
          },
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width: 340,
            locale: 'ar',
          });
        }
      } catch (err) {
        console.error('Failed to init Google Identity Services:', err);
      }
    };

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        initGoogle();
      }
    }, 150);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isOpen, clientId, login, onSuccess, onClose]);

  if (!isOpen) return null;

  async function handleDirectEmailSignIn(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('يرجى إدخال بريدك الإلكتروني (Gmail)');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('يرجى إدخال بريد إلكتروني صالح (مثال: name@gmail.com)');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const cleanName = name.trim() || cleanEmail.split('@')[0];
      const res = await apiAuth.googleLogin({
        email: cleanEmail,
        name: cleanName,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
      });
      login(res.user);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول بالبريد الإلكتروني');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!adminUsername || !adminPassword) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiAuth.passwordLogin({
        username: adminUsername.trim(),
        password: adminPassword.trim(),
      });
      login(res.user);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول كمدير');
    } finally {
      setLoading(false);
    }
  }

  function handleSaveClientId() {
    const trimmed = inputClientId.trim();
    if (!trimmed) {
      localStorage.removeItem('reel_studio_google_client_id');
      setClientId('');
    } else {
      localStorage.setItem('reel_studio_google_client_id', trimmed);
      setClientId(trimmed);
    }
    setClientSavedNotice(true);
    setTimeout(() => setClientSavedNotice(false), 2500);
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.78)',
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
          maxWidth: 440,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px 24px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
        dir="rtl"
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                background: 'linear-gradient(135deg, #10B981, #06B6D4)',
                borderRadius: 8, padding: '4px 8px',
                fontSize: 11, fontWeight: 700, color: '#fff',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <Sparkles size={12} />
                حساب صانع المحتوى
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              تسجيل الدخول إلى Reel Studio
            </h2>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0' }}>
              احفظ ريلزاتك ومشاريعك السحابية وصدر فيديوهاتك بدقة عالية.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              background: 'transparent', border: 0, color: '#9CA3AF',
              cursor: 'pointer', padding: 6, borderRadius: 8,
              transition: 'background 0.15s, color 0.15s',
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
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* Auth Mode Tabs: صناع المحتوى vs حساب المدير */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.05)',
          padding: 4,
          borderRadius: 12,
          gap: 6,
        }}>
          <button
            type="button"
            onClick={() => { setAuthMode('user'); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 0,
              background: authMode === 'user' ? '#10B981' : 'transparent',
              color: authMode === 'user' ? '#fff' : '#94A3B8',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            حساب صانع المحتوى
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('admin'); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 0,
              background: authMode === 'admin' ? '#6366F1' : 'transparent',
              color: authMode === 'admin' ? '#fff' : '#94A3B8',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Key size={14} />
            <span>لوحة تحكم الأدمن</span>
          </button>
        </div>

        {authMode === 'admin' ? (
          /* Admin Login Form */
          <form
            onSubmit={handleAdminLogin}
            style={{
              display: 'flex', flexDirection: 'column', gap: 14,
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 14,
              padding: '18px 16px',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#A5B4FC' }}>
              تسجيل دخول المسؤول والمدير العام 🛡️
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
              يمنحك صلاحيات الإدارة الكاملة: تفعيل حسابات المستخدمين، مراجعة التحويلات المالية، وإدارة مفتاح Gemini API.
            </p>

            <div>
              <label style={{ fontSize: 12, color: '#D1D5DB', marginBottom: 6, display: 'block', fontWeight: 600 }}>
                اسم المستخدم:
              </label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin"
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

            <div>
              <label style={{ fontSize: 12, color: '#D1D5DB', marginBottom: 6, display: 'block', fontWeight: 600 }}>
                كلمة المرور:
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
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

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setAdminUsername('admin');
                  setAdminPassword('admin');
                }}
                style={{
                  background: 'transparent',
                  border: '1px dashed rgba(165, 180, 252, 0.4)',
                  borderRadius: 8,
                  padding: '6px 10px',
                  color: '#A5B4FC',
                  fontSize: 11.5,
                  cursor: 'pointer',
                }}
              >
                تعبئة الافتراضي (admin / admin)
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: '#fff', border: 0, borderRadius: 10,
                padding: '12px 16px', fontSize: 13.5, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 6,
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              <span>دخول لوحة تحكم المسؤول</span>
            </button>
          </form>
        ) : (
          <>

        {/* Section 1: Official Google OAuth Button (if Client ID present) */}
        {clientId ? (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10B981', fontWeight: 600 }}>
              <ShieldCheck size={14} />
              <span>تسجيل رسمي عبر نافذة Google OAuth المنبثقة:</span>
            </div>
            {/* The official rendered Google button container */}
            <div
              ref={googleBtnContainerRef}
              style={{ minHeight: 44, display: 'flex', justifyContent: 'center', width: '100%' }}
            />
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#A78BFA' }}>
                <Loader2 className="animate-spin" size={14} />
                <span>جاري التحقق من هوية Google وإنشاء الجلسة...</span>
              </div>
            )}
          </div>
        ) : (
          /* When no Client ID is configured yet, inform the user clearly */
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#60A5FA' }}>
                <HelpCircle size={15} />
                <span>نافذة الموافقة الرسمية (Google Consent Popup)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                style={{
                  background: 'transparent', border: 0,
                  fontSize: 11, color: '#93C5FD',
                  cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                {showConfig ? 'إخفاء الإعداد' : 'ربط Google Client ID'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: '#94A3B8', lineHeight: 1.5 }}>
              لإظهار نافذة اختيار حسابات جوجل الرسمية التلقائية من Google، يلزم معرف Client ID الخاص بك. يمكنك إدخاله أدناه أو تسجيل الدخول ببريدك مباشرة الآن.
            </p>
          </div>
        )}

        {/* Client ID Configuration Drawer */}
        {showConfig && (
          <div style={{
            background: '#0D0F14',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: 14,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#F3F4F6' }}>
              <Key size={14} color="#F59E0B" />
              <span>إعداد Google OAuth Client ID:</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>
              1. افتح <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: '#60A5FA', textDecoration: 'underline' }}>Google Cloud Console Credentials <ExternalLink size={10} style={{ display: 'inline' }} /></a><br />
              2. أنشئ <b>OAuth Client ID</b> من نوع <b>Web Application</b>.<br />
              3. أضف <code style={{ background: '#1F2937', padding: '1px 4px', borderRadius: 4, direction: 'ltr', display: 'inline-block' }}>http://localhost:3000</code> إلى <i>Authorized JavaScript origins</i>.<br />
              4. الصق الـ Client ID هنا:
            </p>
            <input
              type="text"
              value={inputClientId}
              onChange={(e) => setInputClientId(e.target.value)}
              placeholder="مثال: 123456789-abcdef.apps.googleusercontent.com"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.18)',
                background: '#161922',
                color: '#fff', fontSize: 12,
                direction: 'ltr', textAlign: 'left',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={handleSaveClientId}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#fff', border: 0, borderRadius: 8,
                  padding: '7px 14px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                تفعيل وحفظ Client ID
              </button>
              {clientSavedNotice && (
                <span style={{ fontSize: 11, color: '#34D399', fontWeight: 600 }}>
                  ✓ تم التفعيل!
                </span>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Direct Gmail Sign In (Always Works Immediately) */}
        <form onSubmit={handleDirectEmailSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            position: 'relative', textAlign: 'center', margin: '4px 0',
          }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{
              position: 'relative', background: '#14171F', padding: '0 12px',
              fontSize: 11, color: '#9CA3AF', fontWeight: 600,
            }}>
              {clientId ? 'أو سجّل ببريد مخصص' : 'أو سجّل فوراً بحساب Gmail الخاص بك'}
            </span>
          </div>

          <div>
            <label htmlFor="auth-email-input" style={{ fontSize: 12, color: '#D1D5DB', marginBottom: 6, display: 'block', fontWeight: 600 }}>
              بريدك الإلكتروني (Gmail):
            </label>
            <input
              id="auth-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yourname@gmail.com"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.15)',
                background: '#0D0F14',
                color: '#fff', fontSize: 13,
                direction: 'ltr', textAlign: 'left',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label htmlFor="auth-name-input" style={{ fontSize: 12, color: '#D1D5DB', marginBottom: 6, display: 'block', fontWeight: 600 }}>
              اسمك المعروض (اختياري):
            </label>
            <input
              id="auth-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: محمد علي"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.15)',
                background: '#0D0F14',
                color: '#fff', fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
              color: '#fff', border: 0, borderRadius: 12,
              padding: '12px 18px', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)',
              transition: 'transform 0.1s, opacity 0.2s',
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
            <span>متابعة وتسجيل الدخول بحسابي</span>
          </button>
        </form>
        </>
        )}

        {/* Feature list */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 16,
          display: 'flex', flexDirection: 'column', gap: 8,
          fontSize: 12, color: '#9CA3AF',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={14} color="#10B981" />
            <span>حفظ سحابي تلقائي لجميع مشاريع الريلز الخاصة بك</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={14} color="#10B981" />
            <span>توليد صور توضيحية ذكية وكابشن عربي مجاناً</span>
          </div>
        </div>
      </div>
    </div>
  );
}

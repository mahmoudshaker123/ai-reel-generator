'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Film, Sparkles, Calendar as CalendarIcon, Palette, Zap,
  CreditCard, Settings, Compass, Plus, Mic, Moon, Sun,
  Menu, X, Check, Info, ArrowUpRight, ChevronLeft, LogOut,
  User as UserIcon, ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { AuthModal } from '@/components/modals/AuthModal';
import { AccountSettingsModal } from '@/components/modals/AccountSettingsModal';

interface AppShellProps {
  children: React.ReactNode;
  activeProjectCount?: number;
}

export function AppShell({ children, activeProjectCount = 1 }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    openAuthModal,
    isAuthModalOpen,
    closeAuthModal,
    openSettingsModal,
    isSettingsModalOpen,
    closeSettingsModal,
    logout,
  } = useAuthStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const credits = mounted ? (user?.remaining_credits ?? 2) : 2;
  const userEmail = mounted ? (user?.email || 'حساب تجريبي') : 'حساب تجريبي';
  const userName = mounted ? (user?.name || user?.email || 'صانع محتوى') : 'صانع محتوى';

  const navItems = [
    { label: 'المشاريع والريلز', href: '/', icon: Film, count: activeProjectCount },
    { label: 'مهارات المخرج (Skills)', href: '/skills', icon: Sparkles },
    { label: 'تقويم النشر', href: '/calendar', icon: CalendarIcon },
    { label: 'هوية البراند (Brand kits)', href: '/brand-kits', icon: Palette },
  ];

  const handleNewReel = () => {
    if (pathname === '/') {
      const el = document.getElementById('reel-create-workspace');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push('/?new=1');
    }
  };

  const handleNewVoiceVideo = () => {
    router.push('/voice-video');
  };

  return (
    <div className="app-shell-root" dir="rtl" style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f5f4ef',
      color: '#233d34',
      fontFamily: 'Cairo, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* Mobile Top Header (hidden on desktop via .app-mobile-top-header) */}
      <div className="app-mobile-top-header">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#233d34' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: '#264d40',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#e5edcf',
          }}>
            <Film size={18} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#233d34', letterSpacing: '-0.01em' }}>
            reel<span style={{ fontWeight: 400 }}>studio</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/billing" style={{
            fontSize: 12,
            padding: '5px 10px',
            borderRadius: 7,
            background: '#eef3eb',
            color: '#264d40',
            border: '1px solid #d4ded2',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            textDecoration: 'none',
            fontWeight: 700,
          }}>
            <Zap size={13} fill="#264d40" />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{credits} رصيد</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#233d34',
              padding: 6,
              cursor: 'pointer',
            }}
            aria-label="القائمة الرئيسية"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Persistent Studio Sidebar (On the Right for Arabic RTL) */}
      <aside
        className={`app-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          width: 250,
          background: '#ffffff',
          borderLeft: '1px solid #dfe4da',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: 0,
          zIndex: 45,
          padding: '20px 16px',
          boxSizing: 'border-box',
          overflowY: 'auto',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Brand Header: Logo + Arabic Tagline */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          padding: '0 4px',
        }}>
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            color: '#233d34',
          }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: '#264d40',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e5edcf',
              boxShadow: '0 2px 8px rgba(38, 77, 64, 0.2)',
            }}>
              <Film size={20} />
            </div>
            <div>
              <div style={{
                fontWeight: 800,
                fontSize: 19,
                letterSpacing: '-0.02em',
                color: '#233d34',
                lineHeight: 1.1,
              }}>
                reel<span style={{ fontWeight: 400 }}>studio</span>
              </div>
              <small style={{
                display: 'block',
                fontSize: 10,
                color: '#718077',
                fontWeight: 600,
                marginTop: 2,
              }}>
                مساحة لصناعة حكايتك
              </small>
            </div>
          </Link>
        </div>

        {/* Primary Action Button: + ريل جديد */}
        <button
          onClick={handleNewReel}
          style={{
            width: '100%',
            height: 42,
            background: '#294f40',
            color: '#ffffff',
            border: 'none',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 13.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            transition: 'background 0.15s ease, transform 0.1s ease',
            boxShadow: '0 2px 10px rgba(41, 79, 64, 0.25)',
            marginBottom: 8,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1e3b30')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#294f40')}
        >
          <Plus size={17} strokeWidth={2.5} />
          <span>مشروع ريل جديد</span>
        </button>

        {/* Secondary Action: 🎙️ فيديو صوتي */}
        <button
          onClick={handleNewVoiceVideo}
          style={{
            width: '100%',
            height: 38,
            background: '#f8faf6',
            color: '#345547',
            border: '1px solid #dce4da',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 12.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            marginBottom: 20,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#eef3eb';
            e.currentTarget.style.borderColor = '#294f40';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8faf6';
            e.currentTarget.style.borderColor = '#dce4da';
          }}
        >
          <Mic size={15} color="#294f40" />
          <span>فيديو صوتي بالذكاء الاصطناعي</span>
        </button>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 9,
                  color: isActive ? '#294f40' : '#57675e',
                  background: isActive ? '#edf3ec' : 'transparent',
                  border: isActive ? '1px solid #d4ded2' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 600,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#233d34';
                    e.currentTarget.style.background = '#f5f7f2';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#57675e';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={17} color={isActive ? '#294f40' : '#718077'} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span style={{
                    fontSize: 11,
                    color: isActive ? '#294f40' : '#8a9487',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    background: isActive ? '#dbe6d9' : '#f0f3ed',
                    padding: '2px 7px',
                    borderRadius: 10,
                  }}>
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Section: هويات البراند */}
        <div style={{ marginBottom: 'auto' }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#829188',
            padding: '4px 10px',
            marginBottom: 4,
          }}>
            هوية البراند
          </div>
          <Link
            href="/brand-kits?new=1"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 8,
              color: '#57675e',
              textDecoration: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#233d34')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#57675e')}
          >
            <Plus size={14} color="#718077" />
            <span>إضافة هوية جديدة</span>
          </Link>
        </div>

        {/* Bottom Section: Quota Card + Links + User Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {/* Quota Widget Card (Styled in Warm Studio Theme) */}
          <div style={{
            background: '#f8faf6',
            border: '1px solid #dce4da',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={15} color="#294f40" fill="#294f40" />
                <span style={{ fontWeight: 800, fontSize: 13, color: '#233d34', fontVariantNumeric: 'tabular-nums' }}>
                  {credits} رصيد متبقي
                </span>
              </div>
              <Info size={13} color="#8a9487" style={{ cursor: 'pointer' }} />
            </div>

            <p style={{
              margin: 0,
              fontSize: 11,
              lineHeight: 1.4,
              color: '#718077',
            }}>
              الباقة المجانية · كافية لإنتاج {credits} ريلز
            </p>

            <Link
              href="/billing"
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 0',
                background: '#294f40',
                color: '#ffffff',
                borderRadius: 7,
                textAlign: 'center',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 700,
                transition: 'background 0.15s ease',
                marginTop: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1e3b30')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#294f40')}
            >
              ترقية الباقة
            </Link>
          </div>

          {/* Secondary Links: الباقات والرصيد، إعدادات الحساب، Gemini */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Link
              href="/billing"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 10px',
                borderRadius: 7,
                color: pathname.startsWith('/billing') ? '#294f40' : '#64746b',
                background: pathname.startsWith('/billing') ? '#edf3ec' : 'transparent',
                textDecoration: 'none',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <CreditCard size={15} color={pathname.startsWith('/billing') ? '#294f40' : '#78877e'} />
              <span>الباقات والأسعار</span>
            </Link>

            {mounted && user?.is_staff && (
              <Link
                href="/admin/orders"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 10px',
                  borderRadius: 7,
                  color: '#4f46e5',
                  background: pathname.startsWith('/admin') ? '#eef2ff' : 'rgba(99, 102, 241, 0.08)',
                  textDecoration: 'none',
                  fontSize: 12.5,
                  fontWeight: 700,
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                }}
              >
                <ShieldCheck size={15} color="#4f46e5" />
                <span>لوحة تحكم الإدارة (Admin)</span>
              </Link>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openSettingsModal();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 10px',
                borderRadius: 7,
                color: '#64746b',
                background: 'transparent',
                border: 'none',
                width: '100%',
                textAlign: 'right',
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#233d34')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64746b')}
            >
              <Settings size={15} color="#78877e" />
              <span>إعدادات الحساب</span>
            </button>
          </div>

          {/* User Profile Pill at Bottom */}
          <div
            style={{
              paddingTop: 10,
              borderTop: '1px solid #e5ebe1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (isAuthenticated) {
                openSettingsModal();
              } else {
                openAuthModal();
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 7,
                background: '#e3ebe0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#264d40', flexShrink: 0,
              }}>
                <UserIcon size={14} />
              </div>
              <span style={{
                fontSize: 12,
                color: '#345547',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {userName}
              </span>
            </div>
            {mounted && isAuthenticated && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
                title="تسجيل الخروج"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8a9487',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Studio Viewport (Offset for right-hand sidebar in RTL) */}
      <main
        className="app-main-content"
        style={{
          flex: 1,
          marginRight: 250, // RTL offset for the right sidebar
          minHeight: '100vh',
          background: '#f5f4ef',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        {children}
      </main>

      {/* Global Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <AccountSettingsModal isOpen={isSettingsModalOpen} onClose={closeSettingsModal} />
    </div>
  );
}

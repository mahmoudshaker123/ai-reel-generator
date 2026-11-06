'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, Settings, LogOut, Sparkles, User,
  Check, Crown, ShieldAlert, CreditCard, ClipboardList
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface UserAccountMenuProps {
  theme?: 'light' | 'dark';
  projectCount?: number;
}

export function UserAccountMenu({
  theme = 'light',
  projectCount = 0,
}: UserAccountMenuProps) {
  const router = useRouter();
  const { user, logout, openAuthModal, openSettingsModal } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          width: 120,
          height: 36,
          borderRadius: 24,
          background: theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
          border: theme === 'light' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)',
        }}
      />
    );
  }

  if (!user) {
    return (
      <button
        onClick={openAuthModal}
        className="btn btn-sm"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 14px',
          borderRadius: 10,
          fontSize: 12.5,
          fontWeight: 700,
          background: theme === 'light' ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
          color: theme === 'light' ? '#1F2937' : '#FFFFFF',
          border: theme === 'light' ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,0.15)',
          boxShadow: theme === 'light' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>تسجيل الدخول</span>
      </button>
    );
  }

  const isLight = theme === 'light';
  const remaining = user.remaining_credits ?? 3;
  const isUnlimited = user.is_unlimited;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Account Pill Trigger */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '5px 12px 5px 8px',
          borderRadius: 24,
          background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
          border: isLight ? '1px solid #E2E8F0' : '1px solid rgba(255,255,255,0.14)',
          color: isLight ? '#0F172A' : '#F8FAFC',
          boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Avatar with status indicator */}
        <div style={{ position: 'relative', width: 26, height: 26 }}>
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`}
            alt=""
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              objectFit: 'cover',
              border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(255,255,255,0.2)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10B981',
              border: isLight ? '1.5px solid #FFFFFF' : '1.5px solid #1E2028',
            }}
          />
        </div>

        {/* User Name */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            maxWidth: 100,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isLight ? '#0F172A' : '#F1F5F9',
          }}
        >
          {user.name}
        </span>

        {/* Credits Pill */}
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 12,
            background: isUnlimited
              ? 'rgba(16, 185, 129, 0.18)'
              : remaining > 0
              ? 'rgba(59, 130, 246, 0.18)'
              : 'rgba(239, 68, 68, 0.18)',
            color: isUnlimited
              ? '#10B981'
              : remaining > 0
              ? (isLight ? '#2563EB' : '#60A5FA')
              : '#EF4444',
          }}
        >
          {isUnlimited ? '∞ ريلز' : `${remaining} ريلز`}
        </span>

        {/* Chevron Icon */}
        <ChevronDown
          size={14}
          style={{
            color: isLight ? '#64748B' : '#94A3B8',
            transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div
          dir="rtl"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 1000,
            width: 285,
            background: isLight ? '#ffffff' : '#141720',
            border: isLight ? '1px solid #dfe4da' : '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16,
            padding: 8,
            boxShadow: isLight
              ? '0 16px 36px rgba(36, 62, 53, 0.12), 0 2px 6px rgba(36, 62, 53, 0.04)'
              : '0 16px 36px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {/* User info banner */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 12,
              background: isLight ? '#f5f4ef' : 'rgba(255,255,255,0.03)',
              borderBottom: isLight ? '1px solid #dfe4da' : '1px solid rgba(255,255,255,0.06)',
              marginBottom: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: isLight ? '#233d34' : '#F8FAFC' }}>
                {user.name}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: isLight ? '#264d40' : (isUnlimited ? '#34D399' : '#C4B5FD'),
                  background: isLight ? '#e2ece0' : (isUnlimited ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)'),
                  padding: '2px 7px',
                  borderRadius: 5,
                }}
              >
                {user.plan_name || 'الباقة المجانية'}
              </span>
            </div>

            <div
              style={{
                fontSize: 11.5,
                color: isLight ? '#64746b' : '#94A3B8',
                direction: 'ltr',
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: '2px 0 6px',
              }}
            >
              {user.email}
            </div>

            {/* Quota meter */}
            <div style={{
              background: isLight ? '#ffffff' : '#0D0F14',
              borderRadius: 8,
              padding: '8px 10px',
              border: isLight ? '1px solid #dfe4da' : '1px solid rgba(255,255,255,0.06)',
              marginTop: 4,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: isLight ? '#64746b' : '#94A3B8' }}>رصيد الفيديوهات المتاح:</span>
                <span style={{ color: isLight ? '#264d40' : (isUnlimited ? '#34D399' : (remaining > 0 ? '#60A5FA' : '#F87171')), fontWeight: 800 }}>
                  {isUnlimited ? 'غير محدود' : `${remaining} من ${user.total_credits ?? 3}`}
                </span>
              </div>
              {!isUnlimited && (
                <div style={{ width: '100%', height: 4, borderRadius: 2, background: isLight ? '#e5ebe1' : 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, (remaining / (user.total_credits || 3)) * 100))}%`,
                      background: remaining > 0 ? '#264d40' : '#EF4444',
                      borderRadius: 2,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Option: Upgrade / Pricing */}
          <Link
            href="/billing"
            onClick={() => setDropdownOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 8,
              background: isLight ? '#eef5ee' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))',
              border: isLight ? '1px solid #c9dcc7' : '1px solid rgba(16, 185, 129, 0.3)',
              color: isLight ? '#264d40' : '#34D399',
              fontSize: 12.5,
              fontWeight: 700,
              textDecoration: 'none',
              cursor: 'pointer',
              marginBottom: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Crown size={15} color={isLight ? '#264d40' : '#34D399'} />
              <span>ترقية الباقة والأسعار</span>
            </div>
            <span style={{
              fontSize: 10,
              background: isLight ? '#264d40' : '#10B981',
              color: '#fff',
              padding: '2px 7px',
              borderRadius: 4,
              fontWeight: 700
            }}>
              عروض
            </span>
          </Link>

          {/* Option: Admin Orders Dashboard */}
          <Link
            href="/admin/orders"
            onClick={() => setDropdownOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              background: 'transparent',
              color: isLight ? '#233d34' : '#CBD5E1',
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isLight ? '#f5f4ef' : 'rgba(255,255,255,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ClipboardList size={15} color="#d97706" />
            <span>لوحة مراجعة التحويلات (Admin)</span>
          </Link>

          {/* Option: Account Settings */}
          <button
            onClick={() => {
              setDropdownOpen(false);
              openSettingsModal();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              background: 'transparent',
              border: 0,
              color: isLight ? '#233d34' : '#E2E8F0',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'right',
              width: '100%',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isLight ? '#f5f4ef' : 'rgba(255,255,255,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Settings size={15} color="#264d40" />
            <span>إعدادات الحساب وتفضيلات الفيديو</span>
          </button>

          <div style={{ height: 1, background: isLight ? '#e8ede6' : 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

          {/* Option: Logout */}
          <button
            onClick={() => {
              setDropdownOpen(false);
              logout();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              background: 'transparent',
              border: 0,
              color: '#dc2626',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'right',
              width: '100%',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isLight ? '#fef2f2' : 'rgba(239,68,68,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={15} color="#dc2626" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      )}
    </div>
  );
}

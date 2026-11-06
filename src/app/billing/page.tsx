'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap, Check, ArrowUpLeft, ShieldCheck, CreditCard,
  Sparkles, Crown, HelpCircle, ChevronLeft, Info
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuthStore } from '@/stores/authStore';

export default function BillingPage() {
  const router = useRouter();
  const { user, openAuthModal, isAuthenticated } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const credits = mounted ? (user?.remaining_credits ?? 2) : 2;
  const currentPlan = mounted ? (user?.plan_name || 'الباقة المجانية') : 'الباقة المجانية';

  const handleSelectPlan = (planKey: string) => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    const cycleSuffix = billingCycle === 'yearly' ? 'year_egp' : 'month_egp';
    router.push(`/billing/pay?price=${planKey}_${cycleSuffix}`);
  };

  const scrollToPlans = () => {
    const el = document.getElementById('pricing-tiers-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <AppShell>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '36px 36px 80px',
        width: '100%',
        boxSizing: 'border-box',
        color: '#233d34',
      }}>
        {/* Title & Subtitle */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 'clamp(30px, 3.5vw, 42px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#233d34',
            margin: '0 0 10px 0',
          }}>
            الباقات والرصيد (Plan & Credits)
          </h1>
          <p style={{
            fontSize: 14.5,
            color: '#62756b',
            margin: 0,
            lineHeight: 1.6,
          }}>
            1 رصيد يكفي لصناعة ريل كامل حتى 5 دقائق من الفيديو، مع التعديل والقص والتصدير غير المحدود مجاناً.
          </p>
        </div>

        {/* Top Two Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
          marginBottom: 44,
        }}>
          {/* Card 1: Plan */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dfe4da',
            borderRadius: 14,
            padding: '24px 26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 180,
            boxShadow: '0 2px 8px rgba(36, 62, 53, 0.03)',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: '#718077', fontWeight: 600 }}>الباقة الحالية</span>
                <span style={{
                  fontSize: 11.5,
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: '#f2f6f1',
                  color: '#294f40',
                  fontWeight: 700,
                  border: '1px solid #dce4da',
                }}>
                  نشطة
                </span>
              </div>

              <div style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#233d34',
                letterSpacing: '-0.02em',
                marginBottom: 6,
              }}>
                {currentPlan}
              </div>

              <p style={{ fontSize: 13, color: '#78877e', margin: 0 }}>
                اختر باقة للحصول على رصيد متجدد شهرياً وميزات إخراج سينمائية حصرية.
              </p>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                onClick={scrollToPlans}
                style={{
                  background: '#294f40',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1e3b30')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#294f40')}
              >
                استعراض الباقات والترقية
              </button>
            </div>
          </div>

          {/* Card 2: Credits */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dfe4da',
            borderRadius: 14,
            padding: '24px 26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 180,
            boxShadow: '0 2px 8px rgba(36, 62, 53, 0.03)',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <Zap size={16} color="#294f40" fill="#294f40" />
                <span style={{ fontSize: 13, color: '#718077', fontWeight: 600 }}>رصيد الفيديوهات المتاح</span>
              </div>

              <div style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#233d34',
                letterSpacing: '-0.02em',
                marginBottom: 6,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {credits} <span style={{ fontSize: 18, fontWeight: 600, color: '#718077' }}>رصيد متبقي</span>
              </div>

              <p style={{ fontSize: 13, color: '#78877e', margin: 0 }}>
                كافية لإنتاج حوالي {credits} ريلز تصل مدة كل فيديو إلى 5 دقائق.
              </p>
            </div>

            <div style={{
              marginTop: 20,
              paddingTop: 14,
              borderTop: '1px solid #eef2ec',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12.5,
              color: '#64746b',
            }}>
              <span>الرصيد الإضافي</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{credits} رصيد · لا ينتهي أبداً</span>
            </div>
          </div>
        </div>

        {/* Section: كيف يتم استهلاك الرصيد */}
        <div style={{ marginBottom: 54 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#233d34', margin: '0 0 6px 0' }}>
              كيف يتم استهلاك الرصيد؟
            </h2>
            <p style={{ fontSize: 13.5, color: '#718077', margin: 0 }}>
              تعرف على التكلفة بكل شفافية قبل البدء. التعديلات اللاحقة على الفيديو مجانية تماماً.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 16,
          }}>
            <div style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 10,
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#233d34' }}>فيديو جديد</span>
                <span style={{
                  fontSize: 11.5,
                  padding: '2px 8px',
                  borderRadius: 5,
                  background: '#edf3ec',
                  color: '#294f40',
                  fontWeight: 700,
                }}>
                  1 رصيد
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: '#68776f', margin: 0, lineHeight: 1.5 }}>
                لكل 5 دقائق فيديو: حتى 5 دقائق = 1 رصيد، حتى 10 دقائق = 2 رصيد. التعديل الأول مشمول.
              </p>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 10,
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#233d34' }}>فيديو إضافي في نفس الريل</span>
                <span style={{
                  fontSize: 11.5,
                  padding: '2px 8px',
                  borderRadius: 5,
                  background: '#f2f6f1',
                  color: '#496154',
                  fontWeight: 600,
                }}>
                  مجاناً في الغالب
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: '#68776f', margin: 0, lineHeight: 1.5 }}>
                1 رصيد فقط إذا تجاوز إجمالي مدة مقاطع الريل 5 دقائق إضافية.
              </p>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 10,
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#233d34' }}>قراءة صوتية للسكربت</span>
                <span style={{
                  fontSize: 11.5,
                  padding: '2px 8px',
                  borderRadius: 5,
                  background: '#edf3ec',
                  color: '#294f40',
                  fontWeight: 700,
                }}>
                  1 رصيد
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: '#68776f', margin: 0, lineHeight: 1.5 }}>
                لكل 1,500 حرف يتم قراءتها بصوت الذكاء الاصطناعي البشري المتقن.
              </p>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 10,
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#233d34' }}>مراجعات وتعديلات المخرج</span>
                <span style={{
                  fontSize: 11.5,
                  padding: '2px 8px',
                  borderRadius: 5,
                  background: '#edf3ec',
                  color: '#294f40',
                  fontWeight: 700,
                }}>
                  مشمولة مجاناً
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: '#68776f', margin: 0, lineHeight: 1.5 }}>
                30 تعديل لكل ريل مجاناً، ثم 1 رصيد لكل 30 تعديل إضافي.
              </p>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 10,
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#233d34' }}>كروت الإنفوجرافيك والمصممة</span>
                <span style={{
                  fontSize: 11.5,
                  padding: '2px 8px',
                  borderRadius: 5,
                  background: '#edf3ec',
                  color: '#294f40',
                  fontWeight: 700,
                }}>
                  1 رصيد للكارت
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: '#68776f', margin: 0, lineHeight: 1.5 }}>
                فقط للكروت التي يتم توليدها واعتمادها بنجاح داخل المخطط الزمني.
              </p>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 10,
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#233d34' }}>إعادة التصدير والقص</span>
                <span style={{
                  fontSize: 11.5,
                  padding: '2px 8px',
                  borderRadius: 5,
                  background: '#d1fae5',
                  color: '#065f46',
                  fontWeight: 700,
                }}>
                  مجاناً بلا حدود
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: '#68776f', margin: 0, lineHeight: 1.5 }}>
                صدّر وشارك فيديوهاتك بقدر ما تشاء وبأعلى دقة دون أي رسوم إضافية.
              </p>
            </div>
          </div>
        </div>

        {/* Section: باقات الاشتراك والأسعار */}
        <div id="pricing-tiers-section" style={{ marginBottom: 40 }}>
          {/* Monthly / Yearly Switcher */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 36,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 10,
              padding: 4,
              gap: 4,
              boxShadow: '0 2px 6px rgba(36, 62, 53, 0.04)',
            }}>
              <button
                onClick={() => setBillingCycle('monthly')}
                style={{
                  padding: '8px 20px',
                  borderRadius: 7,
                  border: 'none',
                  background: billingCycle === 'monthly' ? '#294f40' : 'transparent',
                  color: billingCycle === 'monthly' ? '#ffffff' : '#64746b',
                  fontSize: 13,
                  fontWeight: billingCycle === 'monthly' ? 700 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                شهرياً
              </button>

              <button
                onClick={() => setBillingCycle('yearly')}
                style={{
                  padding: '8px 20px',
                  borderRadius: 7,
                  border: 'none',
                  background: billingCycle === 'yearly' ? '#294f40' : 'transparent',
                  color: billingCycle === 'yearly' ? '#ffffff' : '#64746b',
                  fontSize: 13,
                  fontWeight: billingCycle === 'yearly' ? 700 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>سنوياً</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: billingCycle === 'yearly' ? '#e5edcf' : '#edf3ec',
                  color: billingCycle === 'yearly' ? '#264d40' : '#294f40',
                }}>
                  وفر 25%
                </span>
              </button>
            </div>
          </div>

          {/* 3 Pricing Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 22,
            alignItems: 'stretch',
          }}>
            {/* Starter Plan */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 16,
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(36, 62, 53, 0.03)',
            }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 800, color: '#233d34' }}>
                  باقة Starter
                </h3>
                <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#718077' }}>
                  للنشر الأسبوعي وصناع المحتوى المبتدئين
                </p>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: '#233d34', fontVariantNumeric: 'tabular-nums' }}>
                      {billingCycle === 'yearly' ? '135' : '190'} ج.م
                    </span>
                    <span style={{ fontSize: 13, color: '#7a8980' }}>/شهرياً</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <div style={{ fontSize: 12, color: '#7a8980', marginTop: 3 }}>
                      تدفع 1,620 ج.م سنوياً (وفر 30%)
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan('starter')}
                  style={{
                    width: '100%',
                    height: 42,
                    background: '#ffffff',
                    color: '#294f40',
                    border: '1.5px solid #294f40',
                    borderRadius: 9,
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    marginBottom: 24,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#294f40';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#294f40';
                  }}
                >
                  اختيار باقة Starter
                </button>

                <div style={{ fontSize: 13, color: '#233d34', marginBottom: 16, fontWeight: 700 }}>
                  15 رصيد شهرياً · 9.00 ج.م للرصيد
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#52665a' }}>
                    <Check size={16} color="#294f40" strokeWidth={2.5} />
                    <span>كابشن ذكي لكل كلمة</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#52665a' }}>
                    <Check size={16} color="#294f40" strokeWidth={2.5} />
                    <span>تخصيص هوية البراند (Brand kits)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#52665a' }}>
                    <Check size={16} color="#294f40" strokeWidth={2.5} />
                    <span>تعديل وتصدير غير محدود وبدون علامة مائية</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Plan (Highlighted Most Popular) */}
            <div style={{
              background: '#ffffff',
              border: '2.5px solid #294f40',
              borderRadius: 16,
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              boxShadow: '0 8px 30px rgba(41, 79, 64, 0.12)',
            }}>
              <div style={{
                position: 'absolute',
                top: -12,
                left: 20,
                background: '#294f40',
                color: '#e5edcf',
                fontSize: 11.5,
                fontWeight: 800,
                padding: '3px 12px',
                borderRadius: 20,
              }}>
                الأكثر طلباً ⭐
              </div>

              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 800, color: '#233d34' }}>
                  باقة Pro Creator
                </h3>
                <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#718077' }}>
                  للنشر المستمر وصناع المحتوى المحترفين
                </p>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: '#233d34', fontVariantNumeric: 'tabular-nums' }}>
                      {billingCycle === 'yearly' ? '320' : '450'} ج.م
                    </span>
                    <span style={{ fontSize: 13, color: '#7a8980' }}>/شهرياً</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <div style={{ fontSize: 12, color: '#7a8980', marginTop: 3 }}>
                      تدفع 3,840 ج.م سنوياً (وفر 30%)
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan('pro')}
                  style={{
                    width: '100%',
                    height: 42,
                    background: '#294f40',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 9,
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    boxShadow: '0 3px 12px rgba(41, 79, 64, 0.25)',
                    marginBottom: 24,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#1e3b30')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#294f40')}
                >
                  اختيار باقة Pro (الأكثر طلباً)
                </button>

                <div style={{ fontSize: 13, color: '#233d34', marginBottom: 16, fontWeight: 700 }}>
                  50 رصيد شهرياً · 6.40 ج.م للرصيد
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#52665a' }}>
                    <Check size={16} color="#294f40" strokeWidth={2.5} />
                    <span>كل مميزات باقة Starter</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#52665a' }}>
                    <Check size={16} color="#294f40" strokeWidth={2.5} />
                    <span>أولوية معالجة وتصدير فورية (Fast-Track)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#52665a' }}>
                    <Check size={16} color="#294f40" strokeWidth={2.5} />
                    <span>كافة مهارات الإخراج البصري وكروت الشرح</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Plan */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 16,
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(36, 62, 53, 0.03)',
            }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 800, color: '#233d34' }}>
                  باقة Business & Agencies
                </h3>
                <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#718077' }}>
                  للشركات والوكالات وإدارة الحسابات المتعددة
                </p>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 32, fontWeight: 800, color: '#233d34', fontVariantNumeric: 'tabular-nums' }}>
                      {billingCycle === 'yearly' ? '650' : '890'} ج.م
                    </span>
                    <span style={{ fontSize: 13, color: '#7a8980' }}>/شهرياً</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <div style={{ fontSize: 12, color: '#7a8980', marginTop: 3 }}>
                      تدفع 7,800 ج.م سنوياً (وفر 27%)
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleSelectPlan('business')}
                  style={{
                    width: '100%',
                    height: 42,
                    background: '#ffffff',
                    color: '#294f40',
                    border: '1.5px solid #294f40',
                    borderRadius: 9,
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    marginBottom: 24,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#294f40';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#294f40';
                  }}
                >
                  اختيار باقة Business
                </button>

                <div style={{ fontSize: 13, color: '#233d34', marginBottom: 16, fontWeight: 700 }}>
                  150 رصيد شهرياً · 4.33 ج.م للرصيد
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#52665a' }}>
                    <Check size={16} color="#294f40" strokeWidth={2.5} />
                    <span>كل مميزات باقة Pro</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#52665a' }}>
                    <Check size={16} color="#294f40" strokeWidth={2.5} />
                    <span>أقل تكلفة للريل الواحد على الإطلاق</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#52665a' }}>
                    <Check size={16} color="#294f40" strokeWidth={2.5} />
                    <span>هويات براند غير محدودة ودعم فني مخصص</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footnotes */}
          <div style={{
            textAlign: 'center',
            marginTop: 36,
            fontSize: 13,
            color: '#718077',
            lineHeight: 1.8,
          }}>
            <div>جميع الباقات: تشمل كامل الميزات، التعديل والتصدير بدون أي علامة مائية.</div>
            <div>الأسعار بالجنيه المصري، والدفع فوري عبر إنستاباي من أي تطبيق بنكي أو محفظة إلكترونية.</div>
          </div>
        </div>

        {/* Section: Top up */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #dfe4da',
          borderRadius: 14,
          padding: '22px 26px',
          boxShadow: '0 2px 8px rgba(36, 62, 53, 0.03)',
        }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#233d34', margin: '0 0 6px 0' }}>
            شحن رصيد إضافي (Top up)
          </h3>
          <p style={{ fontSize: 13.5, color: '#64746b', margin: 0 }}>
            يمكنك شراء رصيد إضافي في أي وقت فوق أي باقة عبر إنستاباي؛ الرصيد الإضافي يظل صالحاً لحسابك ولا ينتهي أبداً.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

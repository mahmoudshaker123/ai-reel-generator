'use client';
import React, { useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Copy, Check, CheckCircle2, Upload, AlertCircle,
  Loader2, ArrowRight, ArrowUpLeft, ShieldCheck, Film, Image as ImageIcon
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuthStore } from '@/stores/authStore';
import { apiSubscription } from '@/lib/api';

export default function BillingPayPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64746b' }}>
          جاري تجهيز بوابة الدفع...
        </div>
      </AppShell>
    }>
      <BillingPayContent />
    </Suspense>
  );
}

function BillingPayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const priceParam = searchParams.get('price') || 'pro_year_egp';

  const { user, openAuthModal, isAuthenticated } = useAuthStore();

  const isYearly = priceParam.includes('year');
  let planId = 'pro';
  let planTitle = 'باقة المحترف (Pro Creator)';
  let amount = isYearly ? 3840 : 450;
  let creditsPerMonth = 50;

  if (priceParam.startsWith('starter')) {
    planId = 'starter';
    planTitle = 'باقة صناع المحتوى (Starter)';
    amount = isYearly ? 1620 : 190;
    creditsPerMonth = 15;
  } else if (priceParam.startsWith('business')) {
    planId = 'business';
    planTitle = 'باقة الوكالات (Business & Agencies)';
    amount = isYearly ? 7800 : 890;
    creditsPerMonth = 150;
  }

  const instapayTarget = 'sekab@instapay';
  const beneficiaryName = 'Amr Ahmed Taher Mohamed';

  const [transactionRef, setTransactionRef] = useState('');
  const [senderInfo, setSenderInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<{ id: string; orderNumber: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const url = URL.createObjectURL(file);
      setReceiptPreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    if (!senderInfo.trim()) {
      setError('يرجى كتابة رقم الهاتف أو معرّف إنستاباي أو اسم الحساب الذي قمت بالتحويل منه.');
      return;
    }

    if (!transactionRef.trim()) {
      setError('يرجى كتابة رقم العملية أو المرجع الموجود في إيصال التحويل.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiSubscription.checkout({
        plan_id: planId,
        plan_title: `${planTitle} (${isYearly ? 'سنوياً' : 'شهرياً'})`,
        amount,
        payment_method: 'instapay',
        sender_phone: senderInfo.trim(),
        transaction_reference: transactionRef.trim(),
        receipt: receiptFile || undefined,
        notes: notes.trim(),
      });

      setSubmittedOrder({
        id: res.order_id,
        orderNumber: res.order_number,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر إرسال الإيصال. يرجى المحاولة مرة أخرى.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '36px 28px 80px',
        width: '100%',
        boxSizing: 'border-box',
        color: '#233d34',
      }}>
        {/* Back link */}
        <Link
          href="/billing"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: '#64746b',
            textDecoration: 'none',
            marginBottom: 20,
            fontWeight: 600,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#233d34')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64746b')}
        >
          <ArrowRight size={16} />
          <span>الرجوع إلى صفحة الباقات</span>
        </Link>

        {submittedOrder ? (
          /* Order Confirmation View */
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #294f40',
            borderRadius: 18,
            padding: '40px 32px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(41, 79, 64, 0.08)',
          }}>
            <div style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: '#edf3ec',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              color: '#294f40',
            }}>
              <CheckCircle2 size={34} strokeWidth={2.5} />
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#233d34', margin: '0 0 10px 0' }}>
              تم استلام إيصال التحويل بنجاح!
            </h2>

            <p style={{ fontSize: 14.5, color: '#5b6d63', maxWidth: 480, margin: '0 auto 26px', lineHeight: 1.8 }}>
              تم تسجيل طلبك برقم <strong style={{ color: '#294f40' }}>{submittedOrder.orderNumber}</strong>.
              فريق العمل يراجع إيصالات إنستاباي في أسرع وقت وسيتم تفعيل رصيدك ({creditsPerMonth} رصيد) فور المطابقة.
            </p>

            <div style={{
              display: 'inline-flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <Link
                href="/"
                style={{
                  background: '#294f40',
                  color: '#ffffff',
                  padding: '11px 26px',
                  borderRadius: 9,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  boxShadow: '0 2px 10px rgba(41, 79, 64, 0.25)',
                }}
              >
                الذهاب إلى استوديو المشاريع
              </Link>

              <Link
                href="/billing"
                style={{
                  background: '#ffffff',
                  color: '#294f40',
                  border: '1px solid #dce4da',
                  padding: '11px 22px',
                  borderRadius: 9,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                عرض تفاصيل الرصيد
              </Link>
            </div>
          </div>
        ) : (
          /* Checkout Form View */
          <div>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{
                fontSize: 'clamp(26px, 3vw, 36px)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#233d34',
                margin: '0 0 8px 0',
              }}>
                {planTitle}
              </h1>
              <p style={{
                fontSize: 14.5,
                color: '#64746b',
                margin: 0,
              }}>
                {amount.toLocaleString()} ج.م {isYearly ? 'سنوياً' : 'شهرياً'} · بمعدل {creditsPerMonth} رصيد شهرياً
              </p>
            </div>

            {error && (
              <div style={{
                background: '#fff0ea',
                border: '1px solid #e9c6bc',
                borderRadius: 10,
                padding: '12px 16px',
                color: '#a64531',
                fontSize: 13.5,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertCircle size={17} />
                <span>{error}</span>
              </div>
            )}

            {/* Box 1: Send transfer via InstaPay */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 14,
              padding: '24px 26px',
              marginBottom: 24,
              boxShadow: '0 2px 8px rgba(36, 62, 53, 0.03)',
            }}>
              <h2 style={{
                fontSize: 16.5,
                fontWeight: 700,
                color: '#233d34',
                margin: '0 0 16px 0',
              }}>
                1. التحويل عبر إنستاباي (InstaPay)
              </h2>

              <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
                {/* Transfer Target */}
                <div style={{
                  background: '#f8faf6',
                  border: '1px solid #dce4da',
                  borderRadius: 9,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 11.5, color: '#718077', marginBottom: 2 }}>
                      التحويل إلى معرّف إنستاباي (InstaPay Username)
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#233d34', direction: 'ltr', textAlign: 'right' }}>
                      {instapayTarget}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(instapayTarget, 'target')}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #dce4da',
                      color: copiedKey === 'target' ? '#047857' : '#345547',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {copiedKey === 'target' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'target' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>

                {/* Account Holder Name */}
                <div style={{
                  background: '#f8faf6',
                  border: '1px solid #dce4da',
                  borderRadius: 9,
                  padding: '12px 16px',
                }}>
                  <div style={{ fontSize: 11.5, color: '#718077', marginBottom: 2 }}>
                    اسم صاحب الحساب (المستفيد)
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: '#233d34' }}>
                    {beneficiaryName}
                  </div>
                </div>

                {/* Exact Amount */}
                <div style={{
                  background: '#f8faf6',
                  border: '1px solid #dce4da',
                  borderRadius: 9,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 11.5, color: '#718077', marginBottom: 2 }}>
                      المبلغ المطلوب تحويله بالكامل
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#294f40', fontVariantNumeric: 'tabular-nums' }}>
                      {amount.toLocaleString()} ج.م
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(String(amount), 'amount')}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #dce4da',
                      color: copiedKey === 'amount' ? '#047857' : '#345547',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {copiedKey === 'amount' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'amount' ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>

              {/* 4 Steps Guide */}
              <div style={{
                background: '#f5f7f2',
                border: '1px solid #e1e7de',
                borderRadius: 9,
                padding: '14px 18px',
                fontSize: 13,
                color: '#496154',
                lineHeight: 1.8,
              }}>
                <div style={{ fontWeight: 700, color: '#233d34', marginBottom: 4 }}>خطوات التحويل:</div>
                <ol style={{ margin: 0, paddingRight: 18 }}>
                  <li>افتح تطبيق البنك الخاص بك أو تطبيق إنستاباي (InstaPay).</li>
                  <li>اختر <strong>إرسال نقود ← معرّف إنستاباي (Username)</strong>.</li>
                  <li>اكتب المعرّف <strong>{instapayTarget}</strong> والمبلغ الدقيق <strong>{amount.toLocaleString()} ج.م</strong>.</li>
                  <li>أكّد عملية التحويل واحفظ لقطة شاشة للإيصال.</li>
                </ol>
              </div>
            </div>

            {/* Box 2: Tell us it's sent */}
            <form onSubmit={handleSubmit} style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 14,
              padding: '24px 26px',
              boxShadow: '0 2px 8px rgba(36, 62, 53, 0.03)',
            }}>
              <h2 style={{
                fontSize: 16.5,
                fontWeight: 700,
                color: '#233d34',
                margin: '0 0 16px 0',
              }}>
                2. إشعارنا بإتمام التحويل (Tell us it&apos;s sent)
              </h2>

              <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
                {/* Reference Number */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#233d34', marginBottom: 6, fontWeight: 600 }}>
                    الرقم المرجعي للعملية (Reference Number) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 1029384756 أو الرقم الموجود في رسالة التحويل"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    style={{
                      width: '100%',
                      height: 42,
                      background: '#ffffff',
                      border: '1px solid #dfe4da',
                      borderRadius: 8,
                      padding: '0 12px',
                      color: '#233d34',
                      fontSize: 13.5,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#294f40')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#dfe4da')}
                  />
                </div>

                {/* Sent From */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#233d34', marginBottom: 6, fontWeight: 600 }}>
                    تم التحويل من (معرّف إنستاباي أو رقم الهاتف أو اسم صاحب الحساب) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: username@instapay أو 01012345678 أو الاسم المسجل بالبنك"
                    value={senderInfo}
                    onChange={(e) => setSenderInfo(e.target.value)}
                    style={{
                      width: '100%',
                      height: 42,
                      background: '#ffffff',
                      border: '1px solid #dfe4da',
                      borderRadius: 8,
                      padding: '0 12px',
                      color: '#233d34',
                      fontSize: 13.5,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#294f40')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#dfe4da')}
                  />
                </div>

                {/* Screenshot Receipt */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#233d34', marginBottom: 6, fontWeight: 600 }}>
                    إرفاق صورة إيصال التحويل (يوصى بها لتفعيل الباقة فوراً)
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  {receiptPreview ? (
                    <div style={{
                      position: 'relative',
                      display: 'inline-block',
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '1.5px solid #294f40',
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={receiptPreview}
                        alt="معاينة الإيصال"
                        style={{ maxWidth: 220, maxHeight: 180, display: 'block' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptFile(null);
                          setReceiptPreview(null);
                        }}
                        style={{
                          position: 'absolute',
                          top: 6,
                          left: 6,
                          background: 'rgba(0, 0, 0, 0.75)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 4,
                          padding: '3px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        حذف وتغيير
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '1.5px dashed #c2cec1',
                        borderRadius: 10,
                        padding: '22px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: '#f8faf6',
                        transition: 'border-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#294f40')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#c2cec1')}
                    >
                      <Upload size={22} color="#294f40" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 13.5, color: '#233d34', fontWeight: 600 }}>
                        اضغط هنا لاختيار أو إسقاط صورة إيصال التحويل
                      </div>
                      <div style={{ fontSize: 11.5, color: '#7a8980', marginTop: 4 }}>
                        PNG أو JPG أو WebP حتى 10 ميجابايت
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#233d34', marginBottom: 6, fontWeight: 600 }}>
                    ملاحظات إضافية (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="أي ملاحظات تود إضافتها مع الإيصال..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #dfe4da',
                      borderRadius: 8,
                      padding: '10px 12px',
                      color: '#233d34',
                      fontSize: 13.5,
                      boxSizing: 'border-box',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#294f40')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#dfe4da')}
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  height: 46,
                  background: '#294f40',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14.5,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                  boxShadow: '0 3px 12px rgba(41, 79, 64, 0.25)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!submitting) e.currentTarget.style.background = '#1e3b30';
                }}
                onMouseLeave={(e) => {
                  if (!submitting) e.currentTarget.style.background = '#294f40';
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    <span>جاري إرسال الإيصال وتأكيد الطلب...</span>
                  </>
                ) : (
                  <>
                    <span>لقد أتممت التحويل (I&apos;ve sent it)</span>
                    <ArrowUpLeft size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}

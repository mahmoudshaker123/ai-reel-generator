'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Film, CheckCircle2, XCircle, Clock, Search, ExternalLink,
  ChevronLeft, Eye, RefreshCw, Loader2, Phone, ShieldCheck, Filter,
  Users, Key, Zap, Plus, ArrowUpRight, Check, AlertCircle, Save
} from 'lucide-react';
import { apiSubscription, apiAdmin, apiGemini, type SubscriptionOrderAPI, type AdminUserItem } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function AdminOrdersPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'gemini'>('orders');

  // Orders State
  const [orders, setOrders] = useState<SubscriptionOrderAPI[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Users State
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userUpdatingId, setUserUpdatingId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // Gemini Key State
  const [geminiStatus, setGeminiStatus] = useState<{ configured: boolean; masked_key?: string; model?: string } | null>(null);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [geminiSuccessMsg, setGeminiSuccessMsg] = useState('');
  const [geminiErrorMsg, setGeminiErrorMsg] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  function loadOrders() {
    setLoadingOrders(true);
    apiSubscription.adminListOrders(filterStatus || undefined)
      .then((res) => {
        setOrders(res.orders || []);
      })
      .catch((err) => {
        console.error(err);
        setFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'تعذر تحميل الطلبات، يرجى التأكد من تشغيل الخادم.',
        });
      })
      .finally(() => setLoadingOrders(false));
  }

  function loadUsers() {
    setLoadingUsers(true);
    apiAdmin.listUsers()
      .then((res) => {
        setUsersList(res.users || []);
      })
      .catch((err) => {
        setFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'تعذر تحميل المستخدمين',
        });
      })
      .finally(() => setLoadingUsers(false));
  }

  function loadGeminiStatus() {
    apiGemini.getStatus()
      .then((res) => setGeminiStatus(res))
      .catch(() => {});
  }

  useEffect(() => {
    loadOrders();
    loadUsers();
    loadGeminiStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'gemini') loadGeminiStatus();
  }, [activeTab, filterStatus]);

  async function handleOrderAction(orderId: string, action: 'approve' | 'reject') {
    setActionLoading(orderId);
    setFeedback(null);
    try {
      const res = await apiSubscription.adminOrderAction(orderId, action);
      setFeedback({ type: 'success', message: res.message });
      loadOrders();
      loadUsers();
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'فشل تنفيذ الإجراء' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUpdateUser(userId: number, payload: { plan?: string; add_credits?: number; is_unlimited?: boolean }) {
    setUserUpdatingId(userId);
    setFeedback(null);
    try {
      const res = await apiAdmin.updateUser(userId, payload);
      setFeedback({ type: 'success', message: res.message });
      loadUsers();
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'فشل تحديث الحساب' });
    } finally {
      setUserUpdatingId(null);
    }
  }

  async function handleSaveGeminiKey(e: React.FormEvent) {
    e.preventDefault();
    if (!geminiKeyInput.trim()) {
      setGeminiErrorMsg('يرجى لصق مفتاح Gemini API Key أولاً.');
      return;
    }
    setGeminiSaving(true);
    setGeminiSuccessMsg('');
    setGeminiErrorMsg('');
    try {
      const res = await apiGemini.saveKey(geminiKeyInput.trim());
      setGeminiSuccessMsg(res.message || 'تم حفظ وتفعيل مفتاح Gemini Pro بنجاح في السيرفر! 🚀');
      setGeminiKeyInput('');
      loadGeminiStatus();
    } catch (err) {
      setGeminiErrorMsg(err instanceof Error ? err.message : 'فشل التحقق من مفتاح Gemini وحفظه');
    } finally {
      setGeminiSaving(false);
    }
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const approvedCount = orders.filter((o) => o.status === 'approved').length;

  const filteredUsers = usersList.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen" style={{ background: '#0D0F15', color: '#F8FAFC' }} dir="rtl">
      {/* Top Navbar */}
      <header style={{
        background: '#141720',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #10B981, #06B6D4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>
              لوحة تحكم الإدارة الشاملة · Reel Studio
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              إدارة طلبات الاشتراكات، تفعيل حسابات المستخدمين، وإعداد محرك الذكاء الاصطناعي
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => {
              if (activeTab === 'orders') loadOrders();
              if (activeTab === 'users') loadUsers();
              if (activeTab === 'gemini') loadGeminiStatus();
            }}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '7px 12px', color: '#CBD5E1',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
            }}
          >
            <RefreshCw size={14} />
            <span>تحديث البيانات</span>
          </button>
          <Link
            href="/"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: '#94A3B8', fontSize: 13, textDecoration: 'none',
              background: 'rgba(255,255,255,0.06)', padding: '7px 14px', borderRadius: 8,
            }}
          >
            <ChevronLeft size={16} />
            <span>العودة للاستوديو</span>
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: 10,
          marginBottom: 24,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 14,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'orders' ? '#10B981' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'orders' ? '#ffffff' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            <Clock size={16} />
            <span>طلبات التحويلات والاشتراكات</span>
            {pendingCount > 0 && (
              <span style={{
                background: activeTab === 'orders' ? '#065F46' : '#F59E0B',
                color: '#fff',
                fontSize: 11,
                padding: '2px 7px',
                borderRadius: 12,
                fontWeight: 800,
              }}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'users' ? '#6366F1' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'users' ? '#ffffff' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={16} />
            <span>تفعيل وإدارة حسابات المستخدمين ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('gemini')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'gemini' ? '#EC4899' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'gemini' ? '#ffffff' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            <Key size={16} />
            <span>محرك الذكاء الاصطناعي (Gemini Key)</span>
            {geminiStatus?.configured ? (
              <span style={{ background: '#059669', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 8 }}>
                مفعّل
              </span>
            ) : (
              <span style={{ background: '#DC2626', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 8 }}>
                غير متصل
              </span>
            )}
          </button>
        </div>

        {/* Global Feedback Alert */}
        {feedback && (
          <div style={{
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: 10, padding: '12px 16px', fontSize: 13,
            color: feedback.type === 'success' ? '#34D399' : '#F87171',
            marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: 16 }}
            >
              ×
            </button>
          </div>
        )}

        {/* ─── TAB 1: ORDERS ────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div>
            {/* Quick Metrics */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14, marginBottom: 24,
            }}>
              <div style={{
                background: '#141720', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>طلبات قيد المراجعة</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B', fontFamily: 'monospace' }}>
                  {pendingCount}
                </div>
              </div>

              <div style={{
                background: '#141720', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>الطلبات المفعلة بنجاح</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>
                  {approvedCount}
                </div>
              </div>

              <div style={{
                background: '#141720', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>إجمالي العمليات</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>
                  {orders.length}
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              {[
                { id: '', label: 'جميع الطلبات' },
                { id: 'pending', label: `قيد الانتظار (${pendingCount})` },
                { id: 'approved', label: 'المفعلة' },
                { id: 'rejected', label: 'المرفوضة' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                    cursor: 'pointer', border: '1px solid',
                    background: filterStatus === tab.id ? '#10B981' : '#141720',
                    borderColor: filterStatus === tab.id ? '#10B981' : 'rgba(255,255,255,0.08)',
                    color: filterStatus === tab.id ? '#fff' : '#94A3B8',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Orders Table */}
            <div style={{
              background: '#141720', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              {loadingOrders ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <Loader2 className="animate-spin" size={28} color="#10B981" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 13, color: '#94A3B8' }}>جاري تحميل الطلبات…</div>
                </div>
              ) : orders.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>
                  <Clock size={36} color="#475569" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>لا توجد طلبات تحويل حالياً</div>
                  <p style={{ fontSize: 12.5, margin: '6px 0 0' }}>أي طلب اشتراك يقوم به المستخدم سيظهر هنا للمراجعة والموافقة الفورية.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                        <th style={{ padding: '14px 18px' }}>رقم الطلب</th>
                        <th style={{ padding: '14px 18px' }}>المستخدم</th>
                        <th style={{ padding: '14px 18px' }}>الباقة المطلوبة</th>
                        <th style={{ padding: '14px 18px' }}>المبلغ المدفوع</th>
                        <th style={{ padding: '14px 18px' }}>طريقة ورقم التحويل</th>
                        <th style={{ padding: '14px 18px' }}>إيصال التحويل</th>
                        <th style={{ padding: '14px 18px' }}>الحالة</th>
                        <th style={{ padding: '14px 18px' }}>التاريخ</th>
                        <th style={{ padding: '14px 18px', textAlign: 'center' }}>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#CBD5E1', fontSize: 12 }}>
                            #{o.order_number}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 600, color: '#fff' }}>{o.user?.name || o.user?.email || 'صانع محتوى'}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{o.user?.email || '—'}</div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              background: 'rgba(99,102,241,0.15)', color: '#A5B4FC',
                              padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                            }}>
                              {o.plan_title}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                            {o.amount} {o.currency}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#CBD5E1' }}>
                              <Phone size={13} color="#94A3B8" />
                              <span style={{ fontFamily: 'monospace' }}>{o.sender_phone}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>
                              {o.payment_method === 'instapay' ? 'إنستاباي (InstaPay)' : 'فودافون كاش'}
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {o.receipt_url ? (
                              <button
                                onClick={() => setSelectedReceipt(o.receipt_url || null)}
                                style={{
                                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                                  color: '#34D399', borderRadius: 8, padding: '5px 10px',
                                  fontSize: 11.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                                }}
                              >
                                <Eye size={13} />
                                <span>عرض الإيصال</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: '#64748B' }}>بدون إيصال مرفق</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {o.status === 'pending' && (
                              <span style={{ background: 'rgba(245,158,11,0.15)', color: '#FBBF24', padding: '3px 8px', borderRadius: 6, fontSize: 11.5 }}>
                                قيد الانتظار
                              </span>
                            )}
                            {o.status === 'approved' && (
                              <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399', padding: '3px 8px', borderRadius: 6, fontSize: 11.5 }}>
                                تم التفعيل ✓
                              </span>
                            )}
                            {o.status === 'rejected' && (
                              <span style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171', padding: '3px 8px', borderRadius: 6, fontSize: 11.5 }}>
                                مرفوض ✕
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: 11, color: '#94A3B8' }}>
                            {new Date(o.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                            {o.status === 'pending' ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <button
                                  onClick={() => handleOrderAction(o.id, 'approve')}
                                  disabled={actionLoading === o.id}
                                  style={{
                                    background: '#10B981', color: '#fff', border: 0,
                                    borderRadius: 6, padding: '6px 12px', fontSize: 11.5, fontWeight: 700,
                                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                                  }}
                                >
                                  {actionLoading === o.id ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle2 size={13} />}
                                  <span>تفعيل الباقة</span>
                                </button>
                                <button
                                  onClick={() => handleOrderAction(o.id, 'reject')}
                                  disabled={actionLoading === o.id}
                                  style={{
                                    background: 'rgba(239,68,68,0.2)', color: '#F87171', border: '1px solid rgba(239,68,68,0.4)',
                                    borderRadius: 6, padding: '6px 10px', fontSize: 11.5,
                                    cursor: 'pointer',
                                  }}
                                >
                                  رفض
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: '#64748B' }}>تم اتخاذ إجراء</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: USERS MANAGEMENT ─────────────────────────── */}
        {activeTab === 'users' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>
                  إدارة وتفعيل حسابات المستخدمين المباشرة
                </h2>
                <p style={{ fontSize: 12.5, color: '#94A3B8', margin: 0 }}>
                  يمكنك ترقية أي مستخدم للباقة التي تريدها فوراً، أو إضافة رصيد ريلز مخصص لحسابه بنقرة واحدة.
                </p>
              </div>

              {/* Search user */}
              <div style={{ position: 'relative', width: 280 }}>
                <Search size={15} color="#64748B" style={{ position: 'absolute', right: 12, top: 11 }} />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="ابحث بالاسم أو البريد..."
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: '#141720',
                    color: '#fff',
                    fontSize: 12.5,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Users Table */}
            <div style={{
              background: '#141720', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              {loadingUsers ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <Loader2 className="animate-spin" size={28} color="#6366F1" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 13, color: '#94A3B8' }}>جاري تحميل المستخدمين…</div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ padding: 50, textAlign: 'center', color: '#94A3B8' }}>
                  لا توجد حسابات مطابقة للبحث
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                        <th style={{ padding: '14px 18px' }}>المستخدم</th>
                        <th style={{ padding: '14px 18px' }}>البريد الإلكتروني</th>
                        <th style={{ padding: '14px 18px' }}>الباقة الحالية</th>
                        <th style={{ padding: '14px 18px' }}>الرصيد المتبقي</th>
                        <th style={{ padding: '14px 18px' }}>الصلاحية</th>
                        <th style={{ padding: '14px 18px' }}>تاريخ التسجيل</th>
                        <th style={{ padding: '14px 18px', textAlign: 'center' }}>إجراءات الترقية والرصيد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 700, color: '#fff' }}>{u.name || u.username}</div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>@{u.username}</div>
                          </td>
                          <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#CBD5E1', fontSize: 12 }}>
                            {u.email}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              background: u.plan === 'business' ? '#3B0764' : u.plan === 'pro' ? '#1E1B4B' : 'rgba(255,255,255,0.06)',
                              color: u.plan === 'business' ? '#E9D5FF' : u.plan === 'pro' ? '#C7D2FE' : '#94A3B8',
                              padding: '3px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                            }}>
                              {u.plan_name || u.plan}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 800, color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>
                              {u.is_unlimited ? 'غير محدود ♾️' : `${u.remaining_credits} رصيد`}
                            </div>
                            <div style={{ fontSize: 10.5, color: '#64748B' }}>مستهلك: {u.used_credits}</div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {u.is_staff ? (
                              <span style={{ background: 'rgba(99,102,241,0.2)', color: '#A5B4FC', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                                مدير عام (Admin)
                              </span>
                            ) : (
                              <span style={{ color: '#64748B', fontSize: 11 }}>صانع محتوى</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: 11, color: '#94A3B8' }}>
                            {new Date(u.date_joined).toLocaleDateString('ar-EG')}
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {/* Quick Add Credits */}
                              <button
                                onClick={() => handleUpdateUser(u.id, { add_credits: 10 })}
                                disabled={userUpdatingId === u.id}
                                title="إضافة 10 رصيد"
                                style={{
                                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                                  color: '#34D399', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                +10 رصيد
                              </button>

                              <button
                                onClick={() => handleUpdateUser(u.id, { add_credits: 50 })}
                                disabled={userUpdatingId === u.id}
                                title="إضافة 50 رصيد"
                                style={{
                                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                                  color: '#34D399', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                +50 رصيد
                              </button>

                              {/* Upgrade Plan dropdown */}
                              <select
                                defaultValue={u.plan}
                                onChange={(e) => handleUpdateUser(u.id, { plan: e.target.value })}
                                disabled={userUpdatingId === u.id}
                                style={{
                                  background: '#1F2937', color: '#fff', border: '1px solid rgba(255,255,255,0.15)',
                                  borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer',
                                }}
                              >
                                <option value="free">باقة مجانية</option>
                                <option value="starter">Starter</option>
                                <option value="pro">Pro Creator</option>
                                <option value="business">Business</option>
                              </select>

                              {/* Toggle Unlimited */}
                              <button
                                onClick={() => handleUpdateUser(u.id, { is_unlimited: !u.is_unlimited })}
                                disabled={userUpdatingId === u.id}
                                title="تفعيل/تعطيل غير محدود"
                                style={{
                                  background: u.is_unlimited ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)',
                                  color: u.is_unlimited ? '#F87171' : '#A5B4FC',
                                  border: 0, borderRadius: 6, padding: '4px 8px', fontSize: 11,
                                  cursor: 'pointer',
                                }}
                              >
                                {u.is_unlimited ? 'إلغاء اللا محدود' : 'رصيد غير محدود ♾️'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: GEMINI AI ENGINE SETTINGS ─────────────────── */}
        {activeTab === 'gemini' && (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{
              background: '#141720',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: '#EC4899', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Key size={18} />
                  </div>
                  <h2 style={{ fontSize: 19, fontWeight: 900, color: '#fff', margin: 0 }}>
                    إعداد محرك الذكاء الاصطناعي (Google Gemini Engine)
                  </h2>
                </div>
                <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>
                  هذا المفتاح يُحفظ في الخادم الداخلي للموقع ويعمل كمحرك ذكاء اصطناعي موحّد لجميع المستخدمين لتفريغ الصوت، قص فترات السكوت، وتوليد الكروت التوضيحية والهوك الفيروسي دون أن يحتاج أي مستخدم لإدخال مفتاحه الخاص.
                </p>
              </div>

              {/* Status Box */}
              <div style={{
                background: geminiStatus?.configured ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${geminiStatus?.configured ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {geminiStatus?.configured ? (
                    <CheckCircle2 size={20} color="#10B981" />
                  ) : (
                    <AlertCircle size={20} color="#EF4444" />
                  )}
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: geminiStatus?.configured ? '#34D399' : '#F87171' }}>
                      {geminiStatus?.configured ? 'محرك Gemini Pro مفعّل ومتصل في السيرفر ✓' : 'المفتاح غير متصل حالياً ✕'}
                    </div>
                    {geminiStatus?.configured && (
                      <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>
                        المفتاح الحالي المحفوظ: <code style={{ color: '#E2E8F0', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>{geminiStatus.masked_key}</code>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  fontSize: 11.5, fontWeight: 700,
                  background: 'rgba(255,255,255,0.06)',
                  padding: '4px 10px', borderRadius: 8, color: '#CBD5E1',
                }}>
                  {geminiStatus?.model || 'gemini-3.1-flash-lite'}
                </div>
              </div>

              {geminiSuccessMsg && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#34D399',
                }}>
                  {geminiSuccessMsg}
                </div>
              )}

              {geminiErrorMsg && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#F87171',
                }}>
                  {geminiErrorMsg}
                </div>
              )}

              {/* Form to update key */}
              <form onSubmit={handleSaveGeminiKey} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label htmlFor="gemini-key-input" style={{ fontSize: 12.5, fontWeight: 700, color: '#E2E8F0', marginBottom: 6, display: 'block' }}>
                    تحديث أو إضافة مفتاح Gemini API Key جديد:
                  </label>
                  <input
                    id="gemini-key-input"
                    type="password"
                    autoComplete="off"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    placeholder="الصق مفتاح AIzaSy... هنا"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: '#0D0F14',
                      color: '#fff',
                      fontSize: 13,
                      direction: 'ltr',
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>
                    يمكنك الحصول على مفتاح مجاني رسمي وسريع من{' '}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#60A5FA', textDecoration: 'underline' }}>
                      Google AI Studio
                    </a>.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={geminiSaving}
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
                    color: '#fff', border: 0, borderRadius: 10,
                    padding: '12px 18px', fontSize: 13.5, fontWeight: 700,
                    cursor: geminiSaving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
                  }}
                >
                  {geminiSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  <span>حفظ واختبار وتفعيل المفتاح كـ محرك للسيرفر</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Receipt Image Modal */}
      {selectedReceipt && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            style={{
              background: '#141720', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: 20, maxWidth: 640, width: '100%',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>إيصال التحويل البنكي / المحفظة</div>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{ background: 'transparent', border: 0, color: '#94A3B8', cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>
            <div style={{ maxHeight: '70vh', overflowY: 'auto', textAlign: 'center' }}>
              <img
                src={selectedReceipt}
                alt="Receipt"
                style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <a
                href={selectedReceipt}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'rgba(255,255,255,0.06)', color: '#CBD5E1',
                  borderRadius: 8, padding: '7px 14px', fontSize: 12, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <span>فتح بحجم كامل</span>
                <ExternalLink size={13} />
              </a>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{
                  background: '#10B981', color: '#fff', border: 0,
                  borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

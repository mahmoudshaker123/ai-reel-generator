'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Film, Clock,
  Sparkles, CheckCircle2, Trash2, ArrowUpLeft, X, Share2, Eye, Filter
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

export interface CalendarEvent {
  id: string;
  day: number;
  month: number; // 0-11
  year: number;
  time: string;
  title: string;
  skillId: string;
  skillName: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'facebook';
  status: 'scheduled' | 'published' | 'draft';
  hookNotes?: string;
}

const PLATFORMS = [
  { id: 'all', label: 'الكل' },
  { id: 'tiktok', label: 'تيك توك', color: '#fe2c55', bg: 'rgba(254, 44, 85, 0.12)' },
  { id: 'instagram', label: 'إنستجرام ريلز', color: '#e1306c', bg: 'rgba(225, 48, 108, 0.12)' },
  { id: 'youtube', label: 'يوتيوب شورتس', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  { id: 'facebook', label: 'فيسبوك ريلز', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
] as const;

const SKILLS_LIST = [
  { id: 'doros-online', name: 'نمط دروس أونلاين التوضيحي' },
  { id: 'glass-animation', name: 'الزجاج البلوري السينمائي' },
  { id: 'show-the-proof', name: 'إثبات النتائج والدليل الحي' },
  { id: 'product-in-action', name: 'استعراض المنتج أثناء العمل' },
  { id: 'step-by-step-tutorial', name: 'شرح تعليمي خطوة بخطوة 1-2-3' },
  { id: 'quick-tips', name: 'نصائح سريعة وخاطفة' },
  { id: 'big-bold-words', name: 'كلمات ضخمة حركية' },
  { id: 'calm-expert', name: 'خبير هادئ وواثق' },
  { id: 'before-and-after', name: 'مقارنة التحول (قبل وبعد)' },
  { id: 'illustrated-explainer', name: 'مخططات ورسومات توضيحية' },
  { id: 'personal-story', name: 'قصة شخصية وتجربة ملهمة' },
  { id: 'field-notes', name: 'ملاحظات ميدانية وتوثيق عملي' },
];

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'ev-1',
    day: 6,
    month: 10, // November (0-indexed 10)
    year: 2026,
    time: '18:00',
    title: 'شرح الذكاء الاصطناعي وصناعة المحتوى',
    skillId: 'doros-online',
    skillName: 'نمط دروس أونلاين التوضيحي',
    platform: 'tiktok',
    status: 'scheduled',
    hookNotes: 'هوك قوي: لو عاوز توفر 10 ساعات مونتاج أسبوعياً اسمع الفيديو دا.',
  },
  {
    id: 'ev-2',
    day: 10,
    month: 10,
    year: 2026,
    time: '20:00',
    title: 'أفضل 3 أسرار لرفع مشاهدات الريلز',
    skillId: 'quick-tips',
    skillName: 'نصائح سريعة وخاطفة',
    platform: 'instagram',
    status: 'scheduled',
    hookNotes: 'السر رقم 2 هو اللي بيخلي المشاهد ميكملش من غير ما يعمل سيف.',
  },
  {
    id: 'ev-3',
    day: 14,
    month: 10,
    year: 2026,
    time: '15:30',
    title: 'إطلاق ميزة استعراض المنتجات',
    skillId: 'product-in-action',
    skillName: 'استعراض المنتج أثناء العمل',
    platform: 'youtube',
    status: 'scheduled',
    hookNotes: 'حل المشكلة في نقرة واحدة أمام عين العميل.',
  },
  {
    id: 'ev-4',
    day: 20,
    month: 10,
    year: 2026,
    time: '19:00',
    title: 'إثبات نتائج وأرباح الشهر الماضي',
    skillId: 'show-the-proof',
    skillName: 'إثبات النتائج والدليل الحي',
    platform: 'instagram',
    status: 'scheduled',
    hookNotes: 'بالأرقام والدليل الحي من داخل الحساب الحقيقي.',
  },
];

const STORAGE_KEY = 'reelstudio_calendar_events_v2';

export default function CalendarPage() {
  const router = useRouter();

  const [date, setDate] = useState(() => new Date(2026, 10, 6)); // Nov 2026
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDayForModal, setSelectedDayForModal] = useState<number>(6);
  const [selectedEventDetails, setSelectedEventDetails] = useState<CalendarEvent | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('18:00');
  const [formPlatform, setFormPlatform] = useState<'tiktok' | 'instagram' | 'youtube' | 'facebook'>('tiktok');
  const [formSkillId, setFormSkillId] = useState('doros-online');
  const [formHook, setFormHook] = useState('');

  // Load Events
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setEvents(JSON.parse(stored));
      } else {
        setEvents(INITIAL_EVENTS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EVENTS));
      }
    } catch {
      setEvents(INITIAL_EVENTS);
    }
  }, []);

  function saveEventsToStorage(updated: CalendarEvent[]) {
    setEvents(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  // Month Math
  const year = date.getFullYear();
  const month = date.getMonth();

  const monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const currentMonthLabel = `${monthNamesAr[month]} ${year}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayWeekday = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Generate day slots
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Handlers
  function prevMonth() {
    setDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setDate(new Date(year, month + 1, 1));
  }
  function goToToday() {
    setDate(new Date());
  }

  function handleOpenCreateModal(dayNum?: number) {
    setSelectedDayForModal(dayNum || date.getDate());
    setFormTitle('');
    setFormTime('18:00');
    setFormPlatform('tiktok');
    setFormSkillId('doros-online');
    setFormHook('');
    setIsModalOpen(true);
  }

  function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const skillObj = SKILLS_LIST.find((s) => s.id === formSkillId);
    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      day: selectedDayForModal,
      month,
      year,
      time: formTime,
      title: formTitle.trim(),
      skillId: formSkillId,
      skillName: skillObj ? skillObj.name : 'مهارة إخراج مخصصة',
      platform: formPlatform,
      status: 'scheduled',
      hookNotes: formHook.trim(),
    };

    const updated = [...events, newEvent];
    saveEventsToStorage(updated);
    setIsModalOpen(false);
  }

  function handleDeleteEvent(id: string) {
    const updated = events.filter((e) => e.id !== id);
    saveEventsToStorage(updated);
    setSelectedEventDetails(null);
  }

  function handleProduceNow(ev: CalendarEvent) {
    router.push(`/?skill=${ev.skillId}&prompt=${encodeURIComponent(ev.hookNotes || ev.title)}&title=${encodeURIComponent(ev.title)}#reel-create-workspace`);
  }

  // Filter events for current month and selected platform
  const currentMonthEvents = events.filter((e) => {
    const matchesMonth = e.month === month && e.year === year;
    const matchesPlatform = platformFilter === 'all' || e.platform === platformFilter;
    return matchesMonth && matchesPlatform;
  });

  const eventsByDay: Record<number, CalendarEvent[]> = {};
  currentMonthEvents.forEach((ev) => {
    if (!eventsByDay[ev.day]) eventsByDay[ev.day] = [];
    eventsByDay[ev.day].push(ev);
  });

  return (
    <AppShell>
      <div style={{
        maxWidth: 1180,
        margin: '0 auto',
        padding: '52px 36px 80px',
        width: '100%',
        boxSizing: 'border-box',
        color: '#233d34',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 18,
        }}>
          <div>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#718077',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <CalendarIcon size={14} color="#294f40" />
              <span>جدولة المحتوى ونشر المقاطع · Social Media Planner</span>
            </div>
            <h1 style={{
              fontSize: 'clamp(28px, 3.2vw, 38px)',
              fontWeight: 800,
              lineHeight: 1.35,
              letterSpacing: '-0.02em',
              color: '#233d34',
              margin: '0 0 8px 0',
              paddingTop: 4,
            }}>
              تقويم النشر وجدولة الريلز
            </h1>
            <p style={{ fontSize: 14.5, color: '#62756b', margin: 0, maxWidth: 650 }}>
              خطط لمواعيد النشر الأسبوعية، اربط كل موعد بمهارة إخراجية مناسبة، وأنتج ريلز احترافية تلائم خوارزميات تيك توك وإنستجرام ويوتيوب.
            </p>
          </div>

          {/* Top Controls: Month Selector & New Schedule Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 10,
              padding: '6px 14px',
              boxShadow: '0 1px 4px rgba(36, 62, 53, 0.04)',
            }}>
              <button
                onClick={prevMonth}
                style={{ background: 'transparent', border: 'none', color: '#64746b', cursor: 'pointer', padding: 2 }}
                aria-label="الشهر السابق"
                title="الشهر السابق"
              >
                <ChevronRight size={17} />
              </button>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#233d34', minWidth: 110, textAlign: 'center' }}>
                {currentMonthLabel}
              </span>
              <button
                onClick={nextMonth}
                style={{ background: 'transparent', border: 'none', color: '#64746b', cursor: 'pointer', padding: 2 }}
                aria-label="الشهر القادم"
                title="الشهر القادم"
              >
                <ChevronLeft size={17} />
              </button>
            </div>

            <button
              onClick={() => handleOpenCreateModal()}
              style={{
                background: '#294f40',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 18px',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 10px rgba(41, 79, 64, 0.25)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1e3b30')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#294f40')}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>جدولة ريل جديد</span>
            </button>
          </div>
        </div>

        {/* Platform Filter Bar & Month Stats */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 18,
          background: '#ffffff',
          border: '1px solid #dfe4da',
          borderRadius: 12,
          padding: '10px 16px',
        }}>
          {/* Platforms Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#718077', marginInlineEnd: 4 }}>
              تصفية المنصة:
            </span>
            {PLATFORMS.map((p) => {
              const active = platformFilter === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlatformFilter(p.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 7,
                    border: active ? '1px solid #294f40' : '1px solid #e1e7de',
                    background: active ? '#294f40' : '#f8faf6',
                    color: active ? '#ffffff' : '#4b6154',
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#62756b' }}>
            <div>
              مجدول هذا الشهر: <strong style={{ color: '#233d34', fontVariantNumeric: 'tabular-nums' }}>{currentMonthEvents.length} مقطع</strong>
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
          marginBottom: 8,
          textAlign: 'center',
          fontSize: 12.5,
          fontWeight: 700,
          color: '#718077',
        }}>
          <div>الأحد</div>
          <div>الإثنين</div>
          <div>الثلاثاء</div>
          <div>الأربعاء</div>
          <div>الخميس</div>
          <div>الجمعة</div>
          <div>السبت</div>
        </div>

        {/* Calendar Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
        }}>
          {/* Leading empty days */}
          {Array.from({ length: firstDayWeekday }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                minHeight: 115,
                background: 'rgba(0,0,0,0.01)',
                border: '1px dashed #e7ede5',
                borderRadius: 10,
              }}
            />
          ))}

          {/* Active Month Days */}
          {days.map((day) => {
            const dayEvents = eventsByDay[day] || [];
            const isToday = day === 6 && month === 10 && year === 2026;

            return (
              <div
                key={day}
                onClick={() => handleOpenCreateModal(day)}
                style={{
                  minHeight: 115,
                  background: isToday ? '#edf3ec' : '#ffffff',
                  border: isToday
                    ? '2px solid #294f40'
                    : '1px solid #dfe4da',
                  borderRadius: 10,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  boxShadow: '0 1px 4px rgba(36, 62, 53, 0.02)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isToday) e.currentTarget.style.borderColor = '#294f40';
                }}
                onMouseLeave={(e) => {
                  if (!isToday) e.currentTarget.style.borderColor = '#dfe4da';
                }}
              >
                {/* Day Number and Add Button */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 2,
                }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: isToday ? 900 : 700,
                    color: isToday ? '#294f40' : '#496054',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {day}
                  </span>
                  {isToday && (
                    <span style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      background: '#294f40',
                      color: '#fff',
                      padding: '1px 5px',
                      borderRadius: 4,
                    }}>
                      اليوم
                    </span>
                  )}
                </div>

                {/* Event Pills */}
                {dayEvents.map((ev) => {
                  const plat = PLATFORMS.find((p) => p.id === ev.platform);
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEventDetails(ev);
                      }}
                      style={{
                        background: '#294f40',
                        borderRadius: 6,
                        padding: '4px 7px',
                        fontSize: 11,
                        color: '#ffffff',
                        lineHeight: 1.35,
                        boxShadow: '0 1px 3px rgba(41, 79, 64, 0.2)',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <div style={{
                        fontWeight: 700,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {ev.title}
                      </div>
                      <div style={{
                        fontSize: 9.5,
                        color: '#dce6dd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 2,
                      }}>
                        <span>{ev.time}</span>
                        <span style={{
                          fontSize: 8.5,
                          padding: '1px 4px',
                          borderRadius: 3,
                          background: 'rgba(255,255,255,0.15)',
                        }}>
                          {plat?.label || ev.platform}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── MODAL: Schedule New Reel ─────────────────────────── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(35, 61, 52, 0.45)',
            backdropFilter: 'blur(6px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            boxSizing: 'border-box',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 16,
              width: '100%',
              maxWidth: 520,
              padding: '28px 24px',
              boxShadow: '0 20px 50px rgba(36, 62, 53, 0.2)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#233d34', margin: '0 0 4px' }}>
                  جدولة ريل جديد في التقويم 📅
                </h3>
                <p style={{ fontSize: 12.5, color: '#718077', margin: 0 }}>
                  تاريخ النشر: {selectedDayForModal} {currentMonthLabel}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 0, color: '#8a958e', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#345547', display: 'block', marginBottom: 6 }}>
                  عنوان المقطع / فكرة الريل:
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: أفضل 3 أسرار للمونتاج السريع"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d8dfd5',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                    color: '#233d34',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#345547', display: 'block', marginBottom: 6 }}>
                    منصة النشر:
                  </label>
                  <select
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #d8dfd5',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                      color: '#233d34',
                      background: '#fff',
                    }}
                  >
                    <option value="tiktok">تيك توك (TikTok)</option>
                    <option value="instagram">إنستجرام ريلز (Instagram)</option>
                    <option value="youtube">يوتيوب شورتس (Shorts)</option>
                    <option value="facebook">فيسبوك ريلز (Facebook)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#345547', display: 'block', marginBottom: 6 }}>
                    وقت النشر المقترح:
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #d8dfd5',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                      color: '#233d34',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#345547', display: 'block', marginBottom: 6 }}>
                  مهارة المخرج البصري المحددة:
                </label>
                <select
                  value={formSkillId}
                  onChange={(e) => setFormSkillId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d8dfd5',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                    color: '#233d34',
                    background: '#fff',
                  }}
                >
                  {SKILLS_LIST.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#345547', display: 'block', marginBottom: 6 }}>
                  الهوك المقترح أو ملاحظات المحتوى (اختياري):
                </label>
                <textarea
                  value={formHook}
                  onChange={(e) => setFormHook(e.target.value)}
                  placeholder="اكتب الهوك الافتتاحي أو نقاط الشرح الرئيسية..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #d8dfd5',
                    fontSize: 12.5,
                    boxSizing: 'border-box',
                    outline: 'none',
                    color: '#233d34',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: '#294f40',
                    color: '#ffffff',
                    border: 0,
                    borderRadius: 8,
                    padding: '11px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  حفظ في التقويم
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: '#eef2ec',
                    color: '#4f6457',
                    border: 0,
                    borderRadius: 8,
                    padding: '11px 18px',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Event Details & Instant Production ───────── */}
      {selectedEventDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(35, 61, 52, 0.45)',
            backdropFilter: 'blur(6px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            boxSizing: 'border-box',
          }}
          onClick={() => setSelectedEventDetails(null)}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 16,
              width: '100%',
              maxWidth: 480,
              padding: '26px 24px',
              boxShadow: '0 20px 50px rgba(36, 62, 53, 0.2)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: '#edf3eb',
                  color: '#264d40',
                }}>
                  {selectedEventDetails.day} {currentMonthLabel} · {selectedEventDetails.time}
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#233d34', margin: '8px 0 0' }}>
                  {selectedEventDetails.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEventDetails(null)}
                style={{ background: 'transparent', border: 0, color: '#8a958e', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: '#f8faf6',
              border: '1px solid #dfe6dc',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 12.5,
              marginBottom: 18,
            }}>
              <div>
                <span style={{ color: '#718077' }}>المهارة الإخراجية: </span>
                <strong style={{ color: '#264d40' }}>{selectedEventDetails.skillName}</strong>
              </div>
              <div>
                <span style={{ color: '#718077' }}>المنصة: </span>
                <strong style={{ color: '#264d40' }}>
                  {PLATFORMS.find((p) => p.id === selectedEventDetails.platform)?.label || selectedEventDetails.platform}
                </strong>
              </div>
              {selectedEventDetails.hookNotes && (
                <div>
                  <div style={{ color: '#718077', marginBottom: 2 }}>ملاحظات والهوك:</div>
                  <div style={{ color: '#354d40', lineHeight: 1.5 }}>{selectedEventDetails.hookNotes}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => handleProduceNow(selectedEventDetails)}
                style={{
                  background: '#294f40',
                  color: '#ffffff',
                  border: 0,
                  borderRadius: 10,
                  padding: '12px 18px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 3px 12px rgba(41, 79, 64, 0.25)',
                }}
              >
                <Sparkles size={16} />
                <span>إنتاج هذا الريل الآن بهذه المهارة الإخراجية</span>
                <ArrowUpLeft size={16} />
              </button>

              <button
                onClick={() => handleDeleteEvent(selectedEventDetails.id)}
                style={{
                  background: 'transparent',
                  color: '#b91c1c',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '8px',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Trash2 size={14} />
                <span>حذف هذا الموعد من التقويم</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

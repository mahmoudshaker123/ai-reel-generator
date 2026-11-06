'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles, ArrowUpLeft, Search, Plus, Upload, Check,
  Flame, ExternalLink, X, Film, Mic, Play, Eye, Sliders, ChevronLeft
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

interface DirectorSkill {
  id: string;
  title: string;
  titleAr: string;
  isHot?: boolean;
  attribution?: string;
  attributionUrl?: string;
  description: string;
  tags: string[];
  visualPreview: {
    bg: string;
    cardBorder?: string;
    accentColor: string;
    badgeText?: string;
    badgeBg?: string;
    illustrationType: 'glass' | 'doros' | 'proof' | 'product' | 'steps' | 'tips' | 'bold' | 'expert' | 'story' | 'before_after' | 'doodle' | 'notes';
  };
  details: {
    storyRules: string;
    visualRules: string;
    captionStyle: string;
    cameraPacing: string;
    samplePrompt: string;
  };
}

const DIRECTOR_SKILLS: DirectorSkill[] = [
  {
    id: 'glass-animation',
    title: 'Glass Animation',
    titleAr: 'الزجاج البلوري السينمائي',
    isHot: true,
    description: 'المتحدث في إطار سينمائي هادئ مع زوم تدريجي بطيء، وتطفو بطاقات وتسميات بلورية شفافة (Frosted Glass) عند الكلمات المفتاحية.',
    tags: ['بطاقات زجاجية بلورية', 'كابشن دقيق أسفل الوجه', 'خاتمة تفاعلية'],
    visualPreview: {
      bg: '#1b2a38',
      accentColor: '#38bdf8',
      illustrationType: 'glass',
    },
    details: {
      storyRules: 'هوك تشويقي في أول ثانيتين، تصاعد في الشرح، وإبراز الكلمات الهامة ببطاقات زجاجية شفافة.',
      visualRules: 'بطاقات بلورية شفافة (Frosted Glass) مع حدود خفيفة وتوهج ناعم يبرز الكلمات الرئيسية.',
      captionStyle: 'كابشن عربي منسق بدقة أسفل وجه المتحدث مع إضاءة حركية كلمة بكلمة.',
      cameraPacing: 'زوم سينمائي بطيء جداً (Push-in) يضفي تركيزاً وهيبة على المتحدث.',
      samplePrompt: 'احذف فترات السكوت، أضف كابشن دقيق أسفل الوجه، واجعل البطاقات تظهر بزجاج بلوري شفاف عند الكلمات المفتاحية مع خاتمة تطلب التعليق بكلمة معينة.',
    },
  },
  {
    id: 'doros-online',
    title: 'Doros Online',
    titleAr: 'نمط دروس أونلاين التوضيحي',
    isHot: true,
    attribution: 'مستوحى من Doros Online',
    attributionUrl: 'https://dorosonline.com',
    description: 'المتحدث يظل ظاهراً داخل كارت فيديو محدد أنيق في الأسفل، بينما تشرح أعلى الشاشة رسومات ورقية دافئة مع تحديد بالماركر الأصفر.',
    tags: ['ورق دافئ وتحديد أصفر', 'كارت المتحدث الحي', 'مخططات وأمثلة عملية'],
    visualPreview: {
      bg: '#faf6eb',
      cardBorder: '#233d34',
      accentColor: '#eab308',
      illustrationType: 'doros',
    },
    details: {
      storyRules: 'إيقاع تعليمي شيق: طرح المفهوم، تقسيمه لـ 3 نقاط، مع الاستشهاد بأمثلة حقيقية.',
      visualRules: 'خلفية ورقية دافئة، حدود محددة بلون الستوديو الأخضر الداكن، وقلم ماركر أصفر يحدد أهم العبارات.',
      captionStyle: 'خط Cairo عريض عالي الوضوح مع مستطيلات تظليل صفراء بارزة للنقاط المحورية.',
      cameraPacing: 'تقسيم شاشة سينمائي: كارت المتحدث الدائري/المستطيل في الأسفل، وأعلى 55% مخصص للإنفوجرافيك.',
      samplePrompt: 'قسّم الشاشة بنمط دروس أونلاين: المتحدث داخل كارت محدد في الأسفل، وفي الأعلى كروت إنفوجرافيك بخلفية ورقية دافئة وتحديد أصفر على الكلمات الهامة.',
    },
  },
  {
    id: 'show-the-proof',
    title: 'Show the Proof',
    titleAr: 'إثبات النتائج والدليل الحي',
    description: 'لقطات شاشتك ونتائجك الفعلية تظهر فور ذكرها، مع تكبير تلقائي ذكي للرقم أو الجزئية التي تثبت كلامك.',
    tags: ['تكبير تلقائي للقطات الشاشة', 'مقارنات جانبية', 'شارات تأكيد خضراء'],
    visualPreview: {
      bg: '#e8f3ed',
      accentColor: '#10b981',
      illustrationType: 'proof',
    },
    details: {
      storyRules: 'طرح المشكلة -> إدعاء قوي -> إثبات مباشر وفوري لا يمكن إنكاره (أرقام، أرباح، إحصائيات).',
      visualRules: 'تقسيم شاشة مع تسليط الضوء وزوم رقمي على الأرقام والنتائج الهامة.',
      captionStyle: 'نصوص قاطعة وسريعة مع أيقونات علامة الصح الخضراء للتوثيق.',
      cameraPacing: 'قطع سريع ومباشر على الدليل دون أي حشو أو بطء.',
      samplePrompt: 'شيل الفراغات، ركز على إظهار الدليل والنتائج بلقطات مقربة واضحة مع إبراز الأرقام باللون الأخضر.',
    },
  },
  {
    id: 'product-in-action',
    title: 'Product in Action',
    titleAr: 'استعراض المنتج أثناء العمل',
    description: 'المنتج يحل مشكلة حقيقية مباشرة أمام عين المشاهد: المشكلة، الضغطة، والنتيجة الفورية.',
    tags: ['موك أب أجهزة حديثة', 'تفاعل مؤشر الماوس', 'شارات إبراز القيمة'],
    visualPreview: {
      bg: '#edf0f5',
      accentColor: '#2563eb',
      illustrationType: 'product',
    },
    details: {
      storyRules: 'معاناة الطريقة القديمة (3 ثوانٍ)، الضغطة الواحدة داخل الأداة (5 ثوانٍ)، النتيجة المريحة (4 ثوانٍ).',
      visualRules: 'إطارات شاشات حديثة وماك بوك / آيفون مع تموجات تفاعلية مكان نقرة الماوس.',
      captionStyle: 'شارات توضيحية تشير مباشرة للميزة الجاري تفعيلها على الشاشة.',
      cameraPacing: 'حركة كاميرا سلسة فوق تسجيل الشاشة متزامنة مع نبرة المتحدث.',
      samplePrompt: 'ركز على استعراض ميزات المنتج العملية، ضع إطار شاشة أنيق وأضف شارات سريعة للميزات مع كابشن احترافي.',
    },
  },
  {
    id: 'step-by-step',
    title: 'Step-by-Step Tutorial',
    titleAr: 'شرح تعليمي خطوة بخطوة 1-2-3',
    description: 'مراحل مرقمة واضحة مع شريط تقدم بصري، مربعات اختيار للإنجاز، وكارت ملخص تنفيذي في النهاية.',
    tags: ['ترقيم الخطوات 01 02 03', 'شريط تقدم علوي', 'كارت ملخص عملي'],
    visualPreview: {
      bg: '#eef2fa',
      accentColor: '#1d4ed8',
      illustrationType: 'steps',
    },
    details: {
      storyRules: 'تسلسل منطقي ثلاثي: الخطوة الأولى (التجهيز)، الثانية (التنفيذ)، الثالثة (النتيجة المبهرة).',
      visualRules: 'شريط تقدم أفقي أعلى الشاشة يوضح للمشاهد أين وصل الفيديو، مع بادجات أرقام بارزة.',
      captionStyle: 'أرقام خطوات عملاقة (01، 02، 03) تقترن بأفعال أمر واضحة وقصيرة.',
      cameraPacing: 'انتقالات حاسمة بين الخطوات متزامنة مع نبضات صوتية.',
      samplePrompt: 'قسّم الفيديو إلى خطوات مرقمة (1، 2، 3) مع شريط تقدم في الأعلى وبطاقة ملخص عملية في النهاية.',
    },
  },
  {
    id: 'quick-tips',
    title: 'Quick Tips',
    titleAr: 'نصائح سريعة وخاطفة',
    description: 'نصائح متتالية عالية الطاقة مع عدادات رقمية ملفتة، وانتقالات إيقاعية سريعة تثبت في الذاكرة.',
    tags: ['عداد النصائح 1 2 3', 'بطاقات الومضات السريعة', 'مزامنة صوتية حماسية'],
    visualPreview: {
      bg: '#fcf3e8',
      accentColor: '#d97706',
      illustrationType: 'tips',
    },
    details: {
      storyRules: 'تتالي سريع من 3 إلى 5 نصائح مركزة بدون أي مقدمات طويلة أو فراغات.',
      visualRules: 'شارات صفراء وبرتقالية خاطفة، وكلمات مفتاحية مضيئة.',
      captionStyle: 'كابشن كلمتين بكلمتين سريع الظهور والتبديل مع ألوان صفراء جاذبة.',
      cameraPacing: 'قطع حركي سريع (Jump-cuts) مع هزات كاميرا خفيفة عند كل نصيحة.',
      samplePrompt: 'احذف كل السكتات بدقة واجعل النص يظهر كـ نصائح سريعة ومكثفة مع عداد نصائح وألوان جذابة.',
    },
  },
  {
    id: 'big-bold-words',
    title: 'Big Bold Words',
    titleAr: 'كلمات ضخمة حركية (Kinetic)',
    description: 'نصوص عربية عملاقة تشغل المساحة في اللحظات الحماسية لتثبيت الفكرة في ذهن المشاهد كضربات إيقاعية.',
    tags: ['تايبوجرافي حركي ضخم', 'ظهور نصوص متدرج', 'تباين عالي ومؤثر'],
    visualPreview: {
      bg: '#f8ecec',
      accentColor: '#dc2626',
      illustrationType: 'bold',
    },
    details: {
      storyRules: 'حديث حماسي أو رأي جريء تكون فيه الكلمات بمثابة ضربات إيقاع بصرية تصاحب الصوت.',
      visualRules: 'كلمات بخط Cairo 900 الأسود العملاق تشغل 65% من العرض مع تناغم ألوان مدروس.',
      captionStyle: 'نصوص حركية تظهر بقفزة انسيابية خفيفة scale(0.95) إلى scale(1).',
      cameraPacing: 'قطع إيقاعي مضبوط بدقة على مخارج الحروف القوية.',
      samplePrompt: 'ركز على الكلمات الضخمة الحركية (Kinetic Typography) لتظهر بحجم كبير على الكلمات المفتاحية ذات التأثير.',
    },
  },
  {
    id: 'calm-expert',
    title: 'Calm Expert',
    titleAr: 'إخراج الخبير الرصين والهادئ',
    description: 'بساطة وأناقة هادئة بهوامش مريحة، نصوص فخمة، وأشرطة تعريفية سفلية رصينة تمنح المتحدث وقاراً ومصداقية.',
    tags: ['تايبوجرافي تحريري فخم', 'شريط تعريفي سفلي أنيق', 'ألوان رصينة ومريحة'],
    visualPreview: {
      bg: '#f3f4f3',
      accentColor: '#475569',
      illustrationType: 'expert',
    },
    details: {
      storyRules: 'طرح متزن، نبرة واثقة، نصائح مدروسة وموثقة، بدون صراخ أو حركات بصرية مزعجة.',
      visualRules: 'ألوان رمادية وترابية هادئة، فواصل دقيقة 1px، وشريط تعريفي أنيق للمتحدث والمصدر.',
      captionStyle: 'كابشن سفلي رصين بخط واضح وهوامش متناسقة يمنح شعور المقابلات الوثائقية.',
      cameraPacing: 'ثبات بصري ممتاز مع تقريب بطيء غير محسوس يحافظ على تركيز المشاهد.',
      samplePrompt: 'تصميم هادئ وراقي بخطوط فخمة وهوامش واسعة مع كابشن رصين وأشرطة تعريفية سفلية أنيقة.',
    },
  },
  {
    id: 'personal-story',
    title: 'Personal Story',
    titleAr: 'سرد قصصي وتجربة شخصية',
    description: 'قوس سردي إنساني مع تدرج لوني سينمائي دافئ، وكروت ذكريات تشبه صور البولارويد في اللحظات المفصلية.',
    tags: ['تدرج سينمائي دافئ', 'كروت صور ذكريات بولارويد', 'فصول القصة'],
    visualPreview: {
      bg: '#f9f2eb',
      accentColor: '#ea580c',
      illustrationType: 'story',
    },
    details: {
      storyRules: 'بداية مشوقة من قلب الحدث -> الصعوبة السابقة -> نقطة التحول -> الدرس المستفاد.',
      visualRules: 'دفء سينمائي حول أطراف الإطار، وصور تذكارية مقصوصة تظهر في الأوقات المؤثرة.',
      captionStyle: 'كابشن سردي ناعم يبرز الكلمات العاطفية بلون دافئ وجذاب.',
      cameraPacing: 'زاوية كاميرا قريبة تحاكي الحديث مع صديق مع حركة طبيعية حية.',
      samplePrompt: 'إخراج قصصي دافئ مع مؤثرات سينمائية لطيفة وكابشن يعبر عن المشاعر والدروس المستفادة.',
    },
  },
  {
    id: 'before-and-after',
    title: 'Before and After',
    titleAr: 'مقارنة التحول (قبل وبعد)',
    description: 'تقسيم شاشة سينمائي مع خط فاصل متحرك يكشف الفارق الكبير بين الفوضى والحل النهائي بالأرقام والنتائج.',
    tags: ['تقسيم شاشة مقارن', 'مسح وتحول بصري', 'بادج تحسن النتائج'],
    visualPreview: {
      bg: '#eef6f2',
      accentColor: '#059669',
      illustrationType: 'before_after',
    },
    details: {
      storyRules: 'تجسيد ألم الوضع القديم (قبل) مقابل السهولة والنتائج المبهرة في الوضع الجديد (بعد).',
      visualRules: 'تقسيم عمودي أو مسح أفقي مع شارات "قبل" و"بعد" الملونة ونسب التحسن المئوية.',
      captionStyle: 'كابشن يوضح الفروقات بالأرقام مع إبراز كلمات المكسب باللون الأخضر.',
      cameraPacing: 'تزامن دقيق بين استعراض الحالتين جنباً إلى جنب.',
      samplePrompt: 'قسّم الشاشة لمقارنة قبل وبعد مع إبراز نتائج التغيير والتحسن بالأرقام والشارات.',
    },
  },
  {
    id: 'illustrated-explainer',
    title: 'Illustrated Explainer',
    titleAr: 'مخططات ورسومات توضيحية',
    description: 'رسومات كروكية، أسهم، وخرائط ذهنية ترسم وتتحرك بالتزامن مع الشرح لتبسيط المفاهيم الصعبة فوراً.',
    tags: ['رسومات توضيحية متحركة', 'أسهم وروابط منطقية', 'شارات المفاهيم'],
    visualPreview: {
      bg: '#eef8fc',
      accentColor: '#0284c7',
      illustrationType: 'doodle',
    },
    details: {
      storyRules: 'تبسيط الأنظمة المعقدة: "كيف يعمل الشيء خلف الكواليس" بتشبيهات بصرية بديهية.',
      visualRules: 'أسهم توضيحية، فقاعات شرح كروكية، وخطوط ربط ترسم أثناء حديث المتحدث.',
      captionStyle: 'خط عربي كروكي أنيق يقترن بالملاحظات الجانبية.',
      cameraPacing: 'تركيز الكاميرا يتحرك مع رسم الأسهم وتتبع الفكرة عبر الشاشة.',
      samplePrompt: 'أضف رسومات توضيحية وأسهم ومخططات ذهنية تشرح المفاهيم المعقدة خطوة بخطوة أثناء الحديث.',
    },
  },
  {
    id: 'field-notes',
    title: 'Field Notes',
    titleAr: 'توثيق وملاحظات ميدانية',
    description: 'أسلوب توثيق واقعي من كواليس العمل؛ طوابع زمنية دقيقة، خلفية مذكرات، وشعور وثائقي عفوي وجذاب.',
    tags: ['طوابع زمنية رقمية', 'خلفية ورق كرافت', 'شارات الملاحظات'],
    visualPreview: {
      bg: '#f4f5ee',
      accentColor: '#65a30d',
      illustrationType: 'notes',
    },
    details: {
      storyRules: 'بناء في العلن (Building in public)، كواليس وتجارب واقعية، وملاحظات مباشرة بدون تصنع.',
      visualRules: 'طوابع زمنية دقيقة (مثال 00:04:12)، ورق كرافت، وشارات لاصقة ميدانية.',
      captionStyle: 'خط أحادي المسافة يحاكي الآلة الكاتبة مع وميض المؤشر الحي.',
      cameraPacing: 'كاميرا وثائقية عفوية وقطع سريع يظهر البيئة الحقيقية للعمل.',
      samplePrompt: 'أسلوب توثيق ميداني مذكرات عمل مع طابع زمني وكروت ملاحظات ورقية بخط مميز.',
    },
  },
];

export default function SkillsPage() {
  const router = useRouter();
  const [selectedSkillId, setSelectedSkillId] = useState<string>('doros-online');
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<'raw' | 'voice'>('raw');
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [activeDrawerSkill, setActiveDrawerSkill] = useState<DirectorSkill | null>(null);

  const filteredSkills = DIRECTOR_SKILLS.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.titleAr.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleUseSkill = (skill: DirectorSkill) => {
    if (mode === 'voice') {
      router.push(`/voice-video?skill=${skill.id}`);
    } else {
      router.push(`/?skill=${skill.id}#reel-create-workspace`);
    }
  };

  return (
    <AppShell>
      <div style={{
        maxWidth: 1180,
        margin: '0 auto',
        padding: '36px 36px 80px',
        width: '100%',
        boxSizing: 'border-box',
        color: '#233d34',
      }}>
        {/* Top Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          marginBottom: 32,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#718077',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Sparkles size={14} color="#294f40" />
              <span>مكتبة المخرج البصري · The Director&apos;s Bookshelf</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(30px, 3.6vw, 44px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
              color: '#233d34',
              margin: '0 0 12px 0',
            }}>
              مهارة واحدة.. إخراج كامل لفكرتك.
            </h1>

            <p style={{
              fontSize: 14.5,
              lineHeight: 1.8,
              color: '#5b6d63',
              maxWidth: 640,
              margin: 0,
            }}>
              اختر الأسلوب الذي يروي حكايتك بأفضل صورة. كل مهارة تجمع القصة، الكابشن، حركة الكاميرا، والبطاقات التوضيحية بتناغم تام.
            </p>
          </div>

          <button
            onClick={() => {
              if (mode === 'voice') {
                router.push(`/voice-video?skill=${selectedSkillId}`);
              } else {
                router.push(`/?skill=${selectedSkillId}#reel-create-workspace`);
              }
            }}
            style={{
              background: '#294f40',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '11px 22px',
              fontWeight: 700,
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
              boxShadow: '0 3px 12px rgba(41, 79, 64, 0.25)',
              alignSelf: 'flex-start',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1e3b30')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#294f40')}
          >
            <span>صناعة ريل بهذه المهارة</span>
            <ArrowUpLeft size={18} />
          </button>
        </div>

        {/* Mode Switcher Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}>
          {/* Segmented control: فيديو مصور vs فيديو صوتي */}
          <div style={{
            display: 'flex',
            background: '#ffffff',
            padding: 4,
            borderRadius: 10,
            border: '1px solid #dfe4da',
            boxShadow: '0 1px 4px rgba(36, 62, 53, 0.04)',
          }}>
            <button
              onClick={() => setMode('raw')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 16px',
                borderRadius: 7,
                border: 'none',
                background: mode === 'raw' ? '#294f40' : 'transparent',
                color: mode === 'raw' ? '#ffffff' : '#64746b',
                fontSize: 13,
                fontWeight: mode === 'raw' ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Film size={15} />
              <span>فيديو مصور (Raw video)</span>
            </button>

            <button
              onClick={() => setMode('voice')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 16px',
                borderRadius: 7,
                border: 'none',
                background: mode === 'voice' ? '#294f40' : 'transparent',
                color: mode === 'voice' ? '#ffffff' : '#64746b',
                fontSize: 13,
                fontWeight: mode === 'voice' ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Mic size={15} />
              <span>فيديو صوتي من نص (Voice video)</span>
            </button>
          </div>

          <span style={{ fontSize: 12.5, color: '#7a8980', fontWeight: 500 }}>
            هوية البراند الخاصة بك تمنح الفيديو شخصيته الفريدة.
          </span>
        </div>

        {/* Search & Actions Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 22,
          flexWrap: 'wrap',
        }}>
          <div style={{
            flex: 1,
            minWidth: 260,
            position: 'relative',
          }}>
            <Search size={16} color="#8a978f" style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="ابحث عن مهارة إخراجية (مثال: دروس أونلاين، دليل، نصائح)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 42,
                background: '#ffffff',
                border: '1px solid #dfe4da',
                borderRadius: 10,
                padding: '0 40px 0 14px',
                color: '#233d34',
                fontSize: 13.5,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#294f40')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#dfe4da')}
            />
          </div>

          <button
            onClick={() => alert('محرر المهارات المخصصة: يتيح لك صياغة برومبت مخرجك البصري الخاص.')}
            style={{
              height: 42,
              padding: '0 16px',
              background: '#ffffff',
              border: '1px solid #dfe4da',
              borderRadius: 10,
              color: '#345547',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <Plus size={15} color="#294f40" />
            <span>كتابة مهارة جديدة</span>
          </button>
        </div>

        {/* Skills Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
          gap: 20,
        }}>
          {filteredSkills.map((skill) => {
            const isSelected = selectedSkillId === skill.id;

            return (
              <div
                key={skill.id}
                onClick={() => setSelectedSkillId(skill.id)}
                style={{
                  background: '#ffffff',
                  border: isSelected
                    ? '2px solid #294f40'
                    : '1px solid #dfe4da',
                  borderRadius: 14,
                  padding: 18,
                  display: 'flex',
                  gap: 16,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.18s ease',
                  boxShadow: isSelected
                    ? '0 6px 20px rgba(41, 79, 64, 0.12)'
                    : '0 2px 8px rgba(36, 62, 53, 0.03)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#294f40';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(36, 62, 53, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#dfe4da';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(36, 62, 53, 0.03)';
                  }
                }}
              >
                {/* Visual Preview Box */}
                <div style={{
                  width: 105,
                  height: 145,
                  borderRadius: 10,
                  background: skill.visualPreview.bg,
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0,
                  padding: 8,
                  boxSizing: 'border-box',
                }}>
                  {skill.visualPreview.illustrationType === 'doros' ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{
                        background: '#ffffff',
                        borderRadius: 4,
                        padding: 4,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        border: '1px solid #e2e8f0',
                      }}>
                        <div style={{ width: '70%', height: 4, background: '#eab308', borderRadius: 2, marginBottom: 3 }} />
                        <div style={{ width: '90%', height: 2, background: '#cbd5e1', borderRadius: 2 }} />
                      </div>
                      <div style={{
                        alignSelf: 'center',
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        border: '2px solid #233d34',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#294f40' }} />
                      </div>
                    </div>
                  ) : skill.visualPreview.illustrationType === 'glass' ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
                      <div style={{
                        width: '85%',
                        height: 18,
                        borderRadius: 5,
                        background: 'rgba(255, 255, 255, 0.75)',
                        backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(56, 189, 248, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <div style={{ width: '60%', height: 3, background: '#0284c7', borderRadius: 2 }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: '#ffffff',
                        border: '1px solid rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                      }}>
                        <Sparkles size={17} color={skill.visualPreview.accentColor} />
                      </div>
                      <div style={{
                        width: '75%',
                        height: 4,
                        background: skill.visualPreview.accentColor,
                        borderRadius: 2,
                      }} />
                    </div>
                  )}

                  {/* Active Selected Check Badge */}
                  {isSelected && (
                    <div style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#294f40',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#233d34',
                      letterSpacing: '-0.01em',
                    }}>
                      {skill.titleAr}
                    </h3>

                    {skill.isHot && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 4,
                        background: '#fef3c7',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                      }}>
                        <Flame size={11} fill="#b45309" />
                        <span>شائع 🔥</span>
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 11.5, color: '#7a8980', marginBottom: 8, fontWeight: 600 }}>
                    {skill.title}
                  </div>

                  <p style={{
                    margin: '0 0 12px 0',
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: '#5b6d63',
                  }}>
                    {skill.description}
                  </p>

                  {/* Feature Tags */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    marginBottom: 12,
                  }}>
                    {skill.tags.map((tag, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#f5f7f2',
                          color: '#345547',
                          border: '1px solid #dfe5dc',
                          whiteSpace: 'nowrap',
                          fontWeight: 500,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer Row: Details + Use button */}
                  <div style={{
                    marginTop: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 6,
                  }}>
                    {skill.attribution ? (
                      <a
                        href={skill.attributionUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: 11.5,
                          color: '#718077',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <span>{skill.attribution}</span>
                        <ExternalLink size={11} />
                      </a>
                    ) : <span />}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDrawerSkill(skill);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#64746b',
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '4px 6px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#233d34')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#64746b')}
                      >
                        تفاصيل المهارة
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseSkill(skill);
                        }}
                        style={{
                          background: '#294f40',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '5px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>اختيار</span>
                        <ChevronLeft size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Details Modal */}
        {activeDrawerSkill && (
          <div
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(35, 61, 52, 0.45)',
              backdropFilter: 'blur(8px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              boxSizing: 'border-box',
            }}
            onClick={() => setActiveDrawerSkill(null)}
          >
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #dfe4da',
                borderRadius: 16,
                width: '100%',
                maxWidth: 620,
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '28px 30px',
                boxSizing: 'border-box',
                boxShadow: '0 20px 50px rgba(36, 62, 53, 0.2)',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveDrawerSkill(null)}
                style={{
                  position: 'absolute',
                  top: 20,
                  left: 20,
                  background: '#f5f7f2',
                  border: 'none',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64746b',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#233d34' }}>
                  {activeDrawerSkill.titleAr}
                </h2>
                {activeDrawerSkill.isHot && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 5,
                    background: '#fef3c7',
                    color: '#b45309',
                  }}>
                    🔥 مهارة شائعة
                  </span>
                )}
              </div>

              <div style={{ fontSize: 13, color: '#7a8980', marginBottom: 12, fontWeight: 600 }}>
                {activeDrawerSkill.title}
              </div>

              <p style={{ margin: '0 0 24px 0', fontSize: 14, color: '#5b6d63', lineHeight: 1.7 }}>
                {activeDrawerSkill.description}
              </p>

              <div style={{ display: 'grid', gap: 14, marginBottom: 26 }}>
                <div style={{ background: '#f8faf6', borderRadius: 10, padding: '12px 16px', border: '1px solid #dce4da' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#294f40', marginBottom: 4 }}>
                    قواعد الإخراج والتصميم البصري
                  </div>
                  <div style={{ fontSize: 13, color: '#395342', lineHeight: 1.6 }}>
                    {activeDrawerSkill.details.visualRules}
                  </div>
                </div>

                <div style={{ background: '#f8faf6', borderRadius: 10, padding: '12px 16px', border: '1px solid #dce4da' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 4 }}>
                    السرد وتدفق القصة
                  </div>
                  <div style={{ fontSize: 13, color: '#395342', lineHeight: 1.6 }}>
                    {activeDrawerSkill.details.storyRules}
                  </div>
                </div>

                <div style={{ background: '#f8faf6', borderRadius: 10, padding: '12px 16px', border: '1px solid #dce4da' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#047857', marginBottom: 4 }}>
                    أسلوب الكابشن والصوت
                  </div>
                  <div style={{ fontSize: 13, color: '#395342', lineHeight: 1.6 }}>
                    {activeDrawerSkill.details.captionStyle}
                  </div>
                </div>

                <div style={{ background: '#f8faf6', borderRadius: 10, padding: '12px 16px', border: '1px solid #dce4da' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#264d40', marginBottom: 4 }}>
                    توجيه الذكاء الاصطناعي (Prompt Directive)
                  </div>
                  <div style={{ fontSize: 13, color: '#455e4e', lineHeight: 1.7 }}>
                    {activeDrawerSkill.details.samplePrompt}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  handleUseSkill(activeDrawerSkill);
                  setActiveDrawerSkill(null);
                }}
                style={{
                  width: '100%',
                  height: 44,
                  background: '#294f40',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(41, 79, 64, 0.25)',
                }}
              >
                <span>صناعة ريل بهذه المهارة الإخراجية</span>
                <ArrowUpLeft size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

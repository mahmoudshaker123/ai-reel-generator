'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Sparkles, Upload, Clock, Languages, Zap, Music, Captions, ChevronRight, Loader2, CheckCircle2, AlertCircle, Send, MessageSquareText } from 'lucide-react';
import { ReelStyle } from '@/types/api';
import { apiMedia, apiAI, apiDirector, type AIJobAPI, type MediaFileAPI } from '@/lib/api';
import { useTimelineStore } from '@/stores/timelineStore';
import { Project } from '@/types/timeline';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useHistoryStore } from '@/stores/historyStore';

const STYLES: { id: ReelStyle; label: string; desc: string; emoji: string }[] = [
  { id: 'viral',        label: 'Viral',        desc: 'Hook قوي + إيقاع سريع',    emoji: '🔥' },
  { id: 'educational',  label: 'Educational',  desc: 'قيمة + وضوح + هيكل',        emoji: '📚' },
  { id: 'professional', label: 'Professional', desc: 'احترافي + نظيف',             emoji: '💼' },
  { id: 'podcast',      label: 'Podcast',      desc: 'أبرز اللحظات والاقتباسات',   emoji: '🎙️' },
  { id: 'business',     label: 'Business',     desc: 'مبيعات + قيمة + CTA',       emoji: '📈' },
];

export function AIPanel() {
  const params = useParams();
  const projectId = params?.projectId as string | undefined;
  const { initProject } = useTimelineStore();
  const project = useTimelineStore(s => s.project);

  const [step, setStep] = useState<'upload' | 'configure' | 'processing' | 'done' | 'error'>('upload');
  const [uploadedFile, setUploadedFile] = useState<MediaFileAPI | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ReelStyle>('viral');
  const [duration, setDuration] = useState(45);
  const [language, setLanguage] = useState('ar');
  const [options, setOptions] = useState({
    removeSilence: true,
    autoHook: true,
    addCaptions: true,
    autoZoom: false,
    addMusic: false,
  });
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeJob, setActiveJob] = useState<AIJobAPI | null>(null);
  const [directorRequest, setDirectorRequest] = useState('');
  const [directorReply, setDirectorReply] = useState('');

  function toggleOption(key: keyof typeof options) {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Upload video to backend ────────────────────────────────
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    setIsUploading(true);
    try {
      const media = projectId.startsWith('local_')
        ? await apiMedia.uploadGlobal(file)
        : await apiMedia.upload(projectId, file);
      setUploadedFile(media);
    } catch (err) {
      setErrorMsg(`فشل رفع الملف: ${String(err)}`);
      setStep('error');
    } finally {
      setIsUploading(false);
    }
  }

  // ── Start AI generation ────────────────────────────────────
  async function startGeneration() {
    if (!uploadedFile || !projectId) {
      // Demo mode (no file uploaded)
      setErrorMsg('ارفع فيديو أولاً.'); setStep('error');
      return;
    }

    setStep('processing');
    setProgress(5);
    setProgressStep('تهيئة المعالجة...');

    try {
      const job = await apiAI.start(projectId, {
        media_file_id:  uploadedFile.id,
        job_type:       'full_edit',
        target_duration: duration,
        language,
        style:          selectedStyle,
        options,
      });

      setActiveJob(job);

      // Poll until done
      const finalJob = await apiAI.pollUntilDone(
        projectId, job.id,
        (updated) => {
          setActiveJob(updated);
          setProgress(updated.progress);
          const stepLabels: Record<string, string> = {
            pending:      'في الانتظار...',
            transcribing: 'تحليل الصوت بواسطة Gemini...',
            analyzing:    'تحديد أبرز اللحظات...',
            editing:      'بناء خطة التحرير...',
            completed:    'اكتمل! 🎉',
          };
          setProgressStep(stepLabels[updated.status] || updated.status);
        },
        1500,
      );

      // Load the generated timeline into the editor
      if (finalJob.result_timeline) {
        initProject(finalJob.result_timeline as unknown as Project);
        useTimelineStore.getState().setDirty(true);
      }

      setStep('done');

    } catch (err) {
      setErrorMsg(String(err));
      setStep('error');
    }
  }

  async function applyDirectorRequest(request = directorRequest) {
    const text = request.trim().toLocaleLowerCase();
    if (!text || !project) return;
    const { updateClip, removeClip } = useTimelineStore.getState();
    const clips = project.tracks.flatMap(track => track.clips);
    const captions = clips.filter(clip => clip.type === 'caption');
    const hooks = clips.filter(clip => clip.type === 'text').sort((a, b) => a.startTime - b.startTime);
    if (/(كبر|كبّر|اكبر|أكبر|large)/.test(text) && /(كابشن|كلمات|caption)/.test(text) && captions.length) {
      captions.forEach(clip => updateClip(clip.id, { style: { ...clip.style, fontSize: Math.min(112, clip.style.fontSize + 8) } }));
      setDirectorReply('كبرت الكابشن ٨ نقاط. تقدر تتراجع بـ Ctrl+Z.');
    } else if (/(صغر|صغّر|اصغر|أصغر|small)/.test(text) && /(كابشن|كلمات|caption)/.test(text) && captions.length) {
      captions.forEach(clip => updateClip(clip.id, { style: { ...clip.style, fontSize: Math.max(24, clip.style.fontSize - 8) } }));
      setDirectorReply('صغرت الكابشن ٨ نقاط. تقدر تتراجع بـ Ctrl+Z.');
    } else if (/(قصر|قصّر|اختصر|اقصر|short)/.test(text) && /(هوك|hook)/.test(text) && hooks.length) {
      updateClip(hooks[0].id, { duration: Math.min(hooks[0].duration, 2.5) });
      setDirectorReply('قصرت مدة الهوك إلى ٢٫٥ ثانية كحد أقصى. تقدر تتراجع بـ Ctrl+Z.');
    } else if (/(اخف|أخف|اخفي|أخفي|احذف|شيل|hide|remove)/.test(text) && /(كابشن|captions)/.test(text) && captions.length) {
      captions.forEach(clip => removeClip(clip.id));
      setDirectorReply('أخفيت مسار الكابشن. تقدر تتراجع بـ Ctrl+Z.');
    } else {
      if (!projectId || projectId.startsWith('local_')) {
        setDirectorReply('افتح مشروعًا محفوظًا للاتصال بالمخرج الذكي.');
        return;
      }
      setDirectorReply('المخرج يراجع طلبك…');
      try {
        const result = await apiDirector.edit(projectId, request);
        if (!result.changed) {
          setDirectorReply(result.message || 'لم يُطبّق أي تعديل.');
          return;
        }
        useHistoryStore.getState().pushState(project);
        initProject(result.timeline as unknown as Project);
        useTimelineStore.getState().setDirty(true);
        setDirectorReply(result.message || 'تم تطبيق التعديل وحفظه في الـTimeline.');
      } catch (error) {
        setDirectorReply(`تعذر تنفيذ التعديل: ${error instanceof Error ? error.message : 'تحقق من اتصال Gemini'}`);
      }
    }
  }

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {project?.storyPlan && (
        <section style={{ border: '1px solid var(--bg-border)', borderRadius: 12, padding: 12, background: 'var(--bg-elevated)' }} dir="rtl">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 13, marginBottom: 7 }}>
            <MessageSquareText size={15} color="#74bd96" /> المخرج · خطة المشاهد
          </div>
          {project.storyPlan.summary && <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 8px' }}>{project.storyPlan.summary}</p>}
          <div style={{ display: 'grid', gap: 5 }}>
            {project.storyPlan.beats.map((beat, index) => (
              <button key={index} onClick={() => usePlaybackStore.getState().setCurrentTime(beat.startTime)} style={{ textAlign: 'right', padding: '7px 8px', border: '1px solid var(--bg-border)', borderRadius: 8, background: 'transparent', color: 'var(--text-secondary)', fontSize: 10, cursor: 'pointer' }}>
                {Math.floor(beat.startTime / 60)}:{String(Math.floor(beat.startTime % 60)).padStart(2, '0')} · {beat.description}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <input value={directorRequest} onChange={e => setDirectorRequest(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') applyDirectorRequest(); }} placeholder="اطلب تعديلًا سريعًا على الريل…" style={{ flex: 1, minWidth: 0, padding: '9px 10px', borderRadius: 8, border: '1px solid var(--bg-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11 }} />
            <button onClick={() => applyDirectorRequest()} aria-label="تنفيذ تعديل المخرج" style={{ width: 38, border: 0, borderRadius: 8, background: '#27634b', color: 'white', cursor: 'pointer' }}><Send size={15} /></button>
          </div>
          {directorReply && <p role="status" style={{ fontSize: 10, lineHeight: 1.7, color: 'var(--text-muted)', margin: '7px 0 0' }}>{directorReply}</p>}
        </section>
      )}
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.08))',
        border: '1px solid rgba(139,92,246,0.25)',
        borderRadius: 10, padding: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Sparkles size={15} color="#8B5CF6" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>AI Reel Generator</span>
          <span style={{ background: '#10B981', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>Gemini</span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }} dir="rtl">
          ارفع فيديو طويل، الـ AI يحلله ويولد Reel احترافي تلقائياً
        </p>
      </div>

      {/* ── Step: Upload ── */}
      {step === 'upload' && (
        <>
          <label style={{
            border: '2px dashed var(--bg-border)', borderRadius: 10,
            padding: '20px 12px', textAlign: 'center', cursor: 'pointer',
            background: 'var(--bg-elevated)', transition: 'all 150ms ease',
            display: 'block',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#8B5CF6'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--bg-border)'; }}
          >
            <input type="file" accept="video/*,.mp4,.mov,.webm,.avi" style={{ display: 'none' }} onChange={handleFileSelect} />
            {isUploading ? (
              <Loader2 size={20} className="animate-spin" color="#8B5CF6" style={{ margin: '0 auto 8px' }} />
            ) : (
              <Upload size={20} color={uploadedFile ? '#10B981' : 'var(--text-muted)'} style={{ margin: '0 auto 8px' }} />
            )}
            <div style={{ fontSize: 12, fontWeight: 600, color: uploadedFile ? '#10B981' : 'var(--text-secondary)' }} dir="rtl">
              {isUploading ? 'جاري الرفع...' : uploadedFile ? `✓ ${uploadedFile.original_name}` : 'ارفع الفيديو الأصلي'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              MP4, MOV حتى 500 MB
            </div>
          </label>

          <button
            className="btn btn-primary btn-md"
            style={{ width: '100%' }}
            disabled={!uploadedFile || isUploading}
            onClick={() => setStep('configure')}
          >
            <ChevronRight size={15} />
            <span dir="rtl">الإعدادات</span>
          </button>
        </>
      )}

      {/* ── Step: Configure ── */}
      {step === 'configure' && (
        <>
          {/* Style */}
          <div>
            <label className="label">الأسلوب</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStyle(s.id)}
                  style={{
                    background: selectedStyle === s.id ? 'rgba(139,92,246,0.15)' : 'var(--bg-elevated)',
                    border: `1px solid ${selectedStyle === s.id ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                    borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all 150ms ease',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{s.emoji}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }} dir="rtl">{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="label">خيارات</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { key: 'removeSilence', label: 'حذف السكوت',    icon: <Zap size={13} /> },
                { key: 'autoHook',     label: 'Hook تلقائي',    icon: <Sparkles size={13} /> },
                { key: 'addCaptions',  label: 'كابشن تلقائي',   icon: <Captions size={13} /> },
              ].map(opt => (
                <label
                  key={opt.key}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px', borderRadius: 6,
                    background: 'var(--bg-elevated)', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }} dir="rtl">
                    {opt.icon}
                    <span style={{ fontSize: 12 }}>{opt.label}</span>
                  </div>
                  <div
                    onClick={() => toggleOption(opt.key as keyof typeof options)}
                    style={{
                      width: 32, height: 18, borderRadius: 9,
                      background: options[opt.key as keyof typeof options] ? 'var(--brand-primary)' : 'var(--bg-hover)',
                      position: 'relative', cursor: 'pointer', transition: 'background 150ms ease',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2,
                      left: options[opt.key as keyof typeof options] ? 16 : 2,
                      width: 14, height: 14, borderRadius: '50%', background: '#fff',
                      transition: 'left 150ms ease',
                    }} />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="label">اللغة</label>
            <select className="input" value={language} onChange={e => setLanguage(e.target.value)} dir="rtl">
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="ar-en">عربي + English</option>
            </select>
          </div>

          <button
            className="btn btn-primary btn-md"
            style={{ width: '100%' }}
            onClick={startGeneration}
          >
            <Sparkles size={15} />
            <span dir="rtl">توليد الريل الآن</span>
          </button>
        </>
      )}

      {/* ── Step: Processing ── */}
      {step === 'processing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '20px 0' }}>
          <div style={{ position: 'relative', width: 80, height: 80 }}>
            <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--bg-elevated)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke="var(--brand-primary)" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 500ms ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
            }}>
              {progress}%
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }} dir="rtl">
              {progressStep}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }} dir="rtl">
              الذكاء الاصطناعي يحلل ويحرر...
            </div>
            {activeJob && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>
                Job: {activeJob.id.slice(0, 8)}...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step: Done ── */}
      {step === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '16px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(16,185,129,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={28} color="#10B981" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }} dir="rtl">
              اكتمل التوليد! 🎉
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }} dir="rtl">
              تم فتح الريل في الـ Editor — يمكنك تعديله الآن
            </div>
          </div>
          <button
            className="btn btn-surface btn-sm"
            onClick={() => { setStep('upload'); setUploadedFile(null); setActiveJob(null); }}
          >
            <span dir="rtl">توليد ريل آخر</span>
          </button>
        </div>
      )}

      {/* ── Step: Error ── */}
      {step === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '16px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertCircle size={28} color="#EF4444" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 4 }} dir="rtl">
              حدث خطأ
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200 }} dir="rtl">
              {errorMsg || 'تعذر تنفيذ الطلب. تأكد أن Django يعمل.'}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setStep('upload')}>
            <span dir="rtl">حاول مجدداً</span>
          </button>
        </div>
      )}
    </div>
  );
}

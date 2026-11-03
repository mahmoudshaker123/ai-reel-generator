'use client';

import { createPortal } from 'react-dom';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useUIStore } from '@/stores/uiStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { apiRender, type RenderJobAPI } from '@/lib/api';
import {
  X, Download, CheckCircle2, AlertCircle, Film, Sparkles, Loader2, ArrowRight
} from 'lucide-react';
import { formatTime } from '@/lib/utils';

export function ExportModal() {
  const { isExportModalOpen, closeExportModal } = useUIStore();
  const { project } = useTimelineStore();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  const [preset, setPreset] = useState<'tiktok' | 'instagram' | 'shorts' | 'custom'>('tiktok');
  const [resolution, setResolution] = useState('1080x1920');
  const [fps, setFps] = useState(30);
  const [format, setFormat] = useState('mp4');

  const [status, setStatus] = useState<'idle' | 'rendering' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [outputUrl, setOutputUrl] = useState('');

  if (!isExportModalOpen) return null;

  const handleStartExport = async () => {
    if (!project || !projectId) return;

    setStatus('rendering');
    setProgress(5);
    setErrorMsg('');

    try {
      const isLocal = projectId.startsWith('local_');
      if (isLocal) throw new Error('احفظ المشروع على الخادم قبل التصدير.');

      // Start actual render job on Django backend
      const job = await apiRender.start(projectId, {
        resolution,
        format,
        fps,
        timeline: project as unknown as Record<string, unknown>,
      });

      // Poll until finished
      const completedJob = await apiRender.pollUntilDone(
        projectId,
        job.id,
        (current) => setProgress(current.progress),
        1200
      );

      if (!completedJob.output_url) throw new Error('لم يتم إنشاء ملف التصدير.');
      setOutputUrl(completedJob.output_url);
      setStatus('completed');

    } catch (err) {
      console.error('Export error:', err);
      setErrorMsg(String(err));
      setStatus('error');
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="تصدير الفيديو" style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
        borderRadius: 16, width: '100%', maxWidth: 460,
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden',
      }} className="animate-fade-in">

        {/* Modal Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--bg-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #10B981, #06B6D4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Download size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>تصدير الفيديو (Export)</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ملف MP4 جاهز للتنزيل</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={closeExportModal}
            disabled={status === 'rendering'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px' }}>
          {status === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Presets */}
              <div>
                <label className="label">المنصة والنمط</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { id: 'tiktok', label: 'TikTok', icon: '🎵', res: '1080x1920', fps: 30 },
                    { id: 'instagram', label: 'Reels', icon: '📸', res: '1080x1920', fps: 30 },
                    { id: 'shorts', label: 'Shorts', icon: '▶️', res: '1080x1920', fps: 60 },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setPreset(p.id as 'tiktok' | 'instagram' | 'shorts'); setResolution(p.res); setFps(p.fps); }}
                      style={{
                        padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                        background: preset === p.id ? 'rgba(139,92,246,0.15)' : 'var(--bg-elevated)',
                        border: `1.5px solid ${preset === p.id ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                        color: preset === p.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{p.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{p.label}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{p.res}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution & FPS */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label className="label">الدقة (Resolution)</label>
                  <select
                    className="input"
                    value={resolution}
                    onChange={e => setResolution(e.target.value)}
                    dir="ltr"
                  >
                    <option value="1080x1920">1080x1920 (Vertical 9:16)</option>
                    <option value="720x1280">720x1280 (HD 9:16)</option>
                    <option value="1920x1080">1920x1080 (Landscape 16:9)</option>
                    <option value="1080x1080">1080x1080 (Square 1:1)</option>
                  </select>
                </div>
                <div style={{ width: 90 }}>
                  <label className="label">FPS</label>
                  <select
                    className="input"
                    value={fps}
                    onChange={e => setFps(parseInt(e.target.value))}
                  >
                    <option value={30}>30 fps</option>
                    <option value={60}>60 fps</option>
                  </select>
                </div>
              </div>

              {/* Project Info summary */}
              <div style={{
                background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11,
              }}>
                <span style={{ color: 'var(--text-secondary)' }} dir="rtl">مدة الفيديو:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'monospace' }}>
                  {formatTime(project?.duration ?? 0)}
                </span>
              </div>

              {/* Action Button */}
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: 6 }}
                onClick={handleStartExport}
              >
                <Download size={16} />
                تصدير وتحميل الفيديو
              </button>
            </div>
          )}

          {status === 'rendering' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
              <div style={{ position: 'relative', width: 90, height: 90 }}>
                <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="45" cy="45" r="38" fill="none" stroke="var(--bg-elevated)" strokeWidth="6" />
                  <circle
                    cx="45" cy="45" r="38" fill="none"
                    stroke="var(--color-success)" strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 400ms ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
                }}>
                  {progress}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }} dir="rtl">
                  جاري تصدير الفيديو على سيرفر Django...
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }} dir="rtl">
                  يتم دمج المسارات والمؤثرات وتوليد ملف MP4 النهائي
                </div>
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '16px 0' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(16,185,129,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={32} color="#10B981" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }} dir="rtl">
                  تم تصدير الريل بنجاح! 🎉
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }} dir="rtl">
                  الفيديو جاهز الآن للنشر على TikTok و Instagram Reels
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 8 }}>
                <a
                  href={outputUrl.startsWith('http') || outputUrl.startsWith('/') ? outputUrl : '#'}
                  download="reel_video.mp4"
                  className="btn btn-success btn-md"
                  style={{ flex: 1, textDecoration: 'none' }}
                >
                  <Download size={15} />
                  تحميل MP4
                </a>
                <button className="btn btn-surface btn-md" onClick={closeExportModal}>
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '16px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertCircle size={28} color="#EF4444" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>
                  فشل التصدير
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {errorMsg || 'حدث خطأ أثناء معالجة التصدير.'}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setStatus('idle')}>
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>, document.body
  );
}


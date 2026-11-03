'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft, Undo2, Redo2, Download, Sparkles,
  PanelLeft, PanelRight, Loader2, Send, Zap, CheckCircle2, Key
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import { formatTime } from '@/lib/utils';
import { apiGenerateReel, apiGemini } from '@/lib/api';
import { Project } from '@/types/timeline';
import { GeminiKeyModal } from '@/components/modals/GeminiKeyModal';

export function EditorToolbar() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;

  const {
    toggleLeftPanel, toggleRightPanel, isLeftPanelOpen,
    setActiveLeftTab, openExportModal,
  } = useUIStore();
  const { canUndo, canRedo, undo, redo } = useHistoryStore();
  const { project, isDirty, isSaving, initProject } = useTimelineStore();
  const { currentTime } = usePlaybackStore();

  const [promptInput, setPromptInput] = useState('');
  const [isPromptRunning, setIsPromptRunning] = useState(false);
  const [successBadge, setSuccessBadge] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ configured: boolean } | null>(null);

  useEffect(() => {
    checkGemini();
  }, []);

  async function checkGemini() {
    try {
      const res = await apiGemini.getStatus();
      setGeminiStatus(res);
    } catch {
      // ignore
    }
  }

  function handleUndo() {
    undo((prev) => initProject(prev));
  }
  function handleRedo() {
    redo((next) => initProject(next));
  }

  // Instant AI Prompt Command Execution
  async function handleExecutePrompt() {
    if (!promptInput.trim() || isPromptRunning) return;
    setIsPromptRunning(true);

    try {
      // Find mediaFileId from current timeline if available
      let mediaFileId: string | undefined;
      for (const track of project?.tracks || []) {
        for (const clip of track.clips) {
          if (clip.type === 'video' && clip.mediaFileId) {
            mediaFileId = clip.mediaFileId;
            break;
          }
        }
      }

      if (!mediaFileId) throw new Error('ارفع فيديو وأضفه إلى التايملاين أولاً.');
      if (!confirm('سيتم إنشاء مشروع جديد بالتعديلات المطلوبة مع الاحتفاظ بمشروعك الحالي. متابعة؟')) return;
      const res = await apiGenerateReel({
        prompt: promptInput,
        title: project?.title,
        media_file_id: mediaFileId,
      });

      if (res.timeline) {
        router.push(`/editor/${res.project_id}`);
        setSuccessBadge(true);
        setTimeout(() => setSuccessBadge(false), 3000);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'تعذر تطبيق الطلب');
    } finally {
      setIsPromptRunning(false);
    }
  }

  return (
    <div className="editor-toolbar">
      {/* ── Left: Back & Panel Toggles ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => router.push('/')}
          title="العودة للرئيسية"
        >
          <ChevronLeft size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: '#327362',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
          }}>
            <Sparkles size={14} color="#fff" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Reel Studio
          </span>
          <span style={{
            background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)',
            color: '#818CF8', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
          }}>PRO</span>
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--bg-border)', margin: '0 4px' }} />

        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => toggleLeftPanel()}
          title="تبديل اللوحة الجانبية"
        >
          <PanelLeft size={15} />
        </button>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => toggleRightPanel()}
          title="تبديل لوحة الخصائص"
        >
          <PanelRight size={15} />
        </button>
      </div>

      {/* ── Center: AI Magic Prompt Command Bar ── */}
      <div style={{ flex: 1, maxWidth: 540, margin: '0 16px' }}>
        <div style={{
          position: 'relative', display: 'flex', alignItems: 'center',
          background: 'rgba(24, 27, 40, 0.85)',
          border: '1px solid var(--bg-border)',
          borderRadius: 24, padding: '3px 6px 3px 14px',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
          transition: 'all 150ms ease',
        }}>
          <Zap size={14} color="#8B5CF6" style={{ flexShrink: 0, marginLeft: 6 }} />
          <input
            type="text"
            className="input"
            style={{
              border: 'none', background: 'transparent', boxShadow: 'none',
              padding: '4px 6px', fontSize: 12, height: 28,
            }}
            placeholder="اكتب أمراً للذكاء الاصطناعي: 'شيل الفراغات، أضف كابشن وهوك باللون الأصفر'..."
            value={promptInput}
            onChange={e => setPromptInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleExecutePrompt(); }}
            dir="rtl"
          />
          <button
            onClick={handleExecutePrompt}
            disabled={!promptInput.trim() || isPromptRunning}
            className="btn btn-primary btn-sm"
            style={{
              height: 28, borderRadius: 20, padding: '0 12px', fontSize: 11,
              opacity: promptInput.trim() ? 1 : 0.5, flexShrink: 0,
            }}
          >
            {isPromptRunning ? (
              <Loader2 size={12} className="animate-spin" />
            ) : successBadge ? (
              <>
                <CheckCircle2 size={12} color="#10B981" />
                <span>تم!</span>
              </>
            ) : (
              <>
                <span>تطبيق</span>
                <Send size={11} style={{ transform: 'rotate(180deg)' }} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Right: Undo, Status & Export ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Undo/Redo */}
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={handleUndo}
          disabled={!canUndo}
          title="تراجع (Ctrl+Z)"
          style={{ opacity: canUndo ? 1 : 0.3 }}
        >
          <Undo2 size={14} />
        </button>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={handleRedo}
          disabled={!canRedo}
          title="إعادة (Ctrl+Y)"
          style={{ opacity: canRedo ? 1 : 0.3 }}
        >
          <Redo2 size={14} />
        </button>

        <div style={{ width: 1, height: 18, background: 'var(--bg-border)', margin: '0 4px' }} />

        {/* Auto-save Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px' }}>
          {isSaving ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
              <Loader2 size={11} className="animate-spin" />
              <span>جاري الحفظ...</span>
            </div>
          ) : isDirty ? (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} title="تغييرات غير محفوظة" />
          ) : (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} title="محفوظ تلقائياً على السيرفر" />
          )}
        </div>

        {/* Gemini API AI Status Button */}
        <button
          onClick={() => setShowGeminiModal(true)}
          className="btn btn-sm"
          style={{
            gap: 6, padding: '0 12px', height: 32, borderRadius: 8,
            background: geminiStatus?.configured ? 'rgba(139, 92, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${geminiStatus?.configured ? 'rgba(139, 92, 246, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            color: geminiStatus?.configured ? '#C4B5FD' : '#FCD34D',
            fontSize: 11, fontWeight: 700,
          }}
          title="إعدادات اشتراك Gemini API"
        >
          <Sparkles size={13} color={geminiStatus?.configured ? '#A78BFA' : '#F59E0B'} />
          <span>{geminiStatus?.configured ? 'Gemini API نشط' : 'تفعيل Gemini API'}</span>
        </button>

        {/* Export Button */}
        <button
          className="btn btn-gradient-magic btn-sm"
          onClick={openExportModal}
          style={{ gap: 6, padding: '0 16px', height: 34, borderRadius: 8 }}
        >
          <Download size={14} />
          <span>تصدير الريل</span>
        </button>
      </div>

      <GeminiKeyModal
        isOpen={showGeminiModal}
        onClose={() => setShowGeminiModal(false)}
        onSuccess={() => checkGemini()}
      />
    </div>
  );
}

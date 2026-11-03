'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import { useSelectionStore } from '@/stores/selectionStore';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Eye, EyeOff, Heart, MessageCircle, Share2, Disc3, Move, Trash2
} from 'lucide-react';
import { drawText } from '@/lib/drawText';
import { formatTime } from '@/lib/utils';
import { VideoClip, TextClip, CaptionClip } from '@/types/timeline';

// Helper to resolve media URL to full Django host if needed
function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  if (url.startsWith('/media/')) {
    return url;
  }
  return url;
}

export function PreviewArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const rafRef = useRef<number>(0);
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map());

  const { project, updateClip, removeClip } = useTimelineStore();
  const { selectedClipId, selectClip, clearSelection } = useSelectionStore();
  const {
    currentTime, isPlaying, isMuted, volume,
    setCurrentTime, togglePlay, toggleMute,
  } = usePlaybackStore();

  const [scale, setScale] = useState(1);
  const [showSocialOverlay, setShowSocialOverlay] = useState(false); // default off so video is clear
  const containerRef = useRef<HTMLDivElement>(null);

  const canvasWidth = project?.width ?? 1080;
  const canvasHeight = project?.height ?? 1920;
  

  // Reset time to 0 when project ID changes
  useEffect(() => {
    if (project?.id) {
      setCurrentTime(0);
    }
  }, [project?.id, setCurrentTime]);

  // ── Render Canvas Frame ──────────────────────────────────
  const renderFrame = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = project.settings.backgroundColor ?? '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tracks = [...project.tracks].sort((a, b) => a.order - b.order);
    const currentlyPlaying = usePlaybackStore.getState().isPlaying;

    for (const track of tracks) {
      if (track.hidden) continue;

      for (const clip of track.clips) {
        if (time < clip.startTime || time >= clip.startTime + clip.duration) continue;

        const clipLocalTime = time - clip.startTime;

        // Video Drawing
        if (clip.type === 'video') {
          const videoEl = videoRefs.current.get(clip.id);
          if (videoEl && videoEl.readyState >= 2) {
            const sourceTime = clip.trimStart + clipLocalTime * (clip.playbackSpeed || 1);
            // Only force seek when paused or if drift is substantial (> 0.3s)
            const driftThreshold = currentlyPlaying ? 0.35 : 0.08;
            if (!currentlyPlaying && !videoEl.seeking && Math.abs(videoEl.currentTime - sourceTime) > driftThreshold) {
              videoEl.currentTime = sourceTime;
            }

            const t = clip.transform;
            const dw = (canvas.width * t.width * t.scaleX) / 100;
            const dh = (canvas.height * t.height * t.scaleY) / 100;
            const dx = canvas.width / 2 + t.x - dw / 2;
            const dy = canvas.height / 2 + t.y - dh / 2;

            ctx.save();
            ctx.globalAlpha = t.opacity;

            // Live Color Grading
            const cg = clip.colorGrade;
            if (cg) {
              const filters: string[] = [];
              if (cg.brightness !== 0) filters.push(`brightness(${1 + cg.brightness})`);
              if (cg.contrast !== 0) filters.push(`contrast(${1 + cg.contrast})`);
              if (cg.saturation !== 0) filters.push(`saturate(${1 + cg.saturation})`);
              if (cg.hue !== 0) filters.push(`hue-rotate(${cg.hue}deg)`);
              if (filters.length > 0) ctx.filter = filters.join(' ');
            }

            if (t.rotation !== 0) {
              ctx.translate(dx + dw / 2, dy + dh / 2);
              ctx.rotate((t.rotation * Math.PI) / 180);
              ctx.drawImage(videoEl, -dw / 2, -dh / 2, dw, dh);
            } else {
              const fit = Math.min(dw / videoEl.videoWidth, dh / videoEl.videoHeight);
              const vw = videoEl.videoWidth * fit, vh = videoEl.videoHeight * fit;
              ctx.drawImage(videoEl, dx + (dw - vw) / 2, dy + (dh - vh) / 2, vw, vh);
            }

            // Vignette overlay
            if (cg?.vignette && cg.vignette > 0) {
              ctx.filter = 'none';
              const grad = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.75
              );
              grad.addColorStop(0, 'rgba(0,0,0,0)');
              grad.addColorStop(1, `rgba(0,0,0,${cg.vignette * 0.85})`);
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.restore();
          }
        }

        if (clip.type === 'image') {
          let img = imageRefs.current.get(clip.mediaUrl);
          if (!img) {
            img = new Image(); img.crossOrigin = 'anonymous'; img.src = resolveMediaUrl(clip.mediaUrl);
            imageRefs.current.set(clip.mediaUrl, img);
          }
          if (img.complete && img.naturalWidth) {
            const t = clip.transform;
            const maxW = canvas.width * t.width / 100 * t.scaleX;
            const maxH = canvas.height * t.height / 100 * t.scaleY;
            const fit = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
            const w = img.naturalWidth * fit, h = img.naturalHeight * fit;
            ctx.save(); ctx.globalAlpha = t.opacity;
            ctx.translate(canvas.width/2+t.x,canvas.height/2+t.y); ctx.rotate(t.rotation*Math.PI/180);
            ctx.drawImage(img,-w/2,-h/2,w,h); ctx.restore();
          }
        }

        if (clip.type === 'text' || clip.type === 'caption') {
          let text = clip.type === 'text' ? clip.content : '';
          if (clip.type === 'caption') {
            const segment = clip.segments.find(s => clipLocalTime >= s.startTime && clipLocalTime < s.endTime);
            if (!segment) continue;
            text = clip.animationType === 'word_by_word' && segment.words.length
              ? (segment.words.find(w => clipLocalTime >= w.startTime && clipLocalTime < w.endTime)?.word || '') : segment.text;
          }
          if (!text) continue;
          ctx.save(); ctx.globalAlpha = clip.transform.opacity;
          ctx.translate(canvas.width/2+clip.transform.x,canvas.height/2+clip.transform.y);
          ctx.rotate(clip.transform.rotation*Math.PI/180);
          ctx.scale(clip.transform.scaleX,clip.transform.scaleY);
          drawText(ctx,text,clip.style,0,0,canvas.width*.86,clip.type==='text' || clip.style.showBackground);
          ctx.restore();
        }

      }
    }
  }, [project]);

  // ── Sync and initialize video elements ────────────────────
  useEffect(() => {
    if (!project) return;
    const existingIds = new Set(videoRefs.current.keys());
    const neededIds = new Set<string>();

    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (clip.type === 'video' || clip.type === 'audio') {
          neededIds.add(clip.id);
          const fullUrl = resolveMediaUrl((clip as VideoClip).mediaUrl);

          if (!videoRefs.current.has(clip.id)) {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.src = fullUrl;
            video.dataset.source = fullUrl;
            video.preload = 'auto';
            video.onloadedmetadata = () => { video.currentTime = clip.trimStart; };
            video.onseeked = () => renderFrame(usePlaybackStore.getState().currentTime);
            video.muted = isMuted;
            video.volume = volume;
            video.playsInline = true;
            video.style.display = 'none';

            video.onloadeddata = () => {
              renderFrame(usePlaybackStore.getState().currentTime);
            };

            document.body.appendChild(video);
            videoRefs.current.set(clip.id, video);
          } else {
            // Update src if changed
            const existingVideo = videoRefs.current.get(clip.id);
            if (existingVideo && existingVideo.dataset.source !== fullUrl && fullUrl) {
              existingVideo.src = fullUrl;
              existingVideo.dataset.source = fullUrl;
              existingVideo.load();
            }
          }
        }
      }
    }

    for (const id of existingIds) {
      if (!neededIds.has(id)) {
        const el = videoRefs.current.get(id);
        if (el) { el.pause(); el.remove(); }
        videoRefs.current.delete(id);
      }
    }
  }, [project]);

  useEffect(() => {
    const elements = videoRefs.current;
    return () => {
      for (const el of elements.values()) { el.pause(); el.removeAttribute('src'); el.load(); el.remove(); }
      elements.clear();
      usePlaybackStore.getState().setIsPlaying(false);
    };
  }, []);

  // ── Animation Loop ───────────────────────────────────────
  useEffect(() => {
    let previous = performance.now();
    const activeIds = new Set<string>();
    const pending = new Set<string>();
    const loop = (timestamp: number) => {
      const state = usePlaybackStore.getState();
      let time = state.currentTime;
      let master: { element: HTMLVideoElement; start: number; trim: number; speed: number } | undefined;
      for (const track of project?.tracks ?? []) {
        for (const clip of track.clips) {
          if (clip.type !== 'video' && clip.type !== 'audio') continue;
          const el = videoRefs.current.get(clip.id);
          if (!el) continue;
          const active = !track.hidden && time >= clip.startTime && time < clip.startTime + clip.duration;
          if (!active) { el.pause(); activeIds.delete(clip.id); continue; }
          const speed = clip.type === 'video' ? (clip.playbackSpeed || 1) : 1;
          const target = clip.trimStart + (time - clip.startTime) * speed;
          const entering = !activeIds.has(clip.id);
          activeIds.add(clip.id);
          el.playbackRate = speed;
          el.muted = state.isMuted || track.muted || clip.muted;
          const local = time - clip.startTime;
          const fade = Math.min(1, clip.audioFade.fadeIn > 0 ? local / clip.audioFade.fadeIn : 1,
            clip.audioFade.fadeOut > 0 ? (clip.duration - local) / clip.audioFade.fadeOut : 1);
          el.volume = Math.max(0, Math.min(1, state.volume * clip.volume * (project?.globalAudio.masterVolume ?? 1) * fade));
          if (!el.seeking && el.readyState >= 1 && (entering || Math.abs(el.currentTime - target) > (state.isPlaying ? 0.2 : 0.025))) {
            el.currentTime = Math.max(0, target);
          }
          if (!state.isPlaying) el.pause();
          else if (el.paused && !pending.has(clip.id) && !el.seeking) {
            pending.add(clip.id);
            el.play().catch(() => usePlaybackStore.getState().setIsPlaying(false)).finally(() => pending.delete(clip.id));
          }
          if (!master) master = { element: el, start: clip.startTime, trim: clip.trimStart, speed };
        }
      }
      if (state.isPlaying) {
        // The media clock owns playback; buffering freezes the timeline instead of seeking every frame.
        if (master) {
          if (!master.element.seeking && master.element.readyState >= 2 && !master.element.paused)
            time = master.start + (master.element.currentTime - master.trim) / master.speed;
          if (master.element.ended) time += 0.001;
        } else time += Math.min((timestamp - previous) / 1000, 0.1);
        const end = project?.duration ?? 0;
        if (time >= end) { time = end; state.setIsPlaying(false); }
        state.setCurrentTime(Math.max(0, time));
      }
      previous = timestamp;
      renderFrame(time);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [project, renderFrame]);

  // ── Responsive Scaling ───────────────────────────────────
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const availH = container.clientHeight - 86;
      const availW = container.clientWidth - 40;
      const scaleH = availH / canvasHeight;
      const scaleW = availW / canvasWidth;
      setScale(Math.max(0.02, Math.min(scaleH, scaleW, 0.95)));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [canvasWidth, canvasHeight]);

  // ── Active text & caption overlay clips at current time ──
  const activeOverlayClips = useMemo(() => {
    if (!project) return [];
    const list: (TextClip | CaptionClip)[] = [];
    for (const track of project.tracks) {
      if (track.hidden) continue;
      for (const clip of track.clips) {
        if ((clip.type === 'text' || clip.type === 'caption') &&
            currentTime >= clip.startTime &&
            currentTime < clip.startTime + clip.duration) {
          list.push(clip as (TextClip | CaptionClip));
        }
      }
    }
    return list;
  }, [project, currentTime]);

  // Direct On-Screen Drag & Drop handler for Captions and Text
  const handleDragOverlayStart = useCallback((e: React.MouseEvent, clip: TextClip | CaptionClip) => {
    e.preventDefault();
    e.stopPropagation();
    selectClip(clip.id, clip.trackId);

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initialTransformX = clip.transform.x;
    const initialTransformY = clip.transform.y;

    const onMove = (me: MouseEvent) => {
      const dx = (me.clientX - startClientX) / Math.max(scale, 0.1);
      const dy = (me.clientY - startClientY) / Math.max(scale, 0.1);
      const newX = Math.round(initialTransformX + dx);
      const newY = Math.round(initialTransformY + dy);

      updateClip(clip.id, {
        transform: {
          ...clip.transform,
          x: newX,
          y: newY,
        },
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [scale, selectClip, updateClip]);

  // Safe play toggle (restarts from 0 if reached end)
  const handlePlayToggle = () => {
    const maxDur = project?.duration ?? 0;
    const cur = usePlaybackStore.getState().currentTime;
    if (cur >= maxDur - 0.15) {
      setCurrentTime(0);

    }
    togglePlay();
  };

  const progress = project?.duration ? currentTime / project.duration : 0;

  return (
    <div ref={containerRef} className="editor-preview" style={{ flexDirection: 'column', gap: 14 }}>
      {/* ── Smartphone Chassis (iPhone 16 Pro Frame) ── */}
      <div
        className="phone-mockup-frame"
        style={{
          width: canvasWidth * scale,
          height: canvasHeight * scale,
        }}
      >
        {/* Dynamic Island */}
        

        {/* Video Canvas */}
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />

        {/* ── Interactive Direct Drag & Drop Overlays for Captions & Text ── */}
        {activeOverlayClips.map((clip) => {
          const isSelected = selectedClipId === clip.id;
          const isCaption = clip.type === 'caption';

          const centerX = (canvasWidth / 2 + clip.transform.x) * scale;
          const centerY = (canvasHeight / 2 + clip.transform.y) * scale;

          let displayLabel = 'نص';
          let boxW = 180 * scale;
          let boxH = 46 * scale;

          if (isCaption) {
            const cap = clip as CaptionClip;
            const clipLocal = currentTime - clip.startTime;
            const seg = cap.segments.find(s => clipLocal >= s.startTime && clipLocal < s.endTime);
            displayLabel = seg?.text || 'كابشن تلقائي';
            boxW = Math.max(140, Math.min(canvasWidth * 0.9 * scale, displayLabel.length * 13 * scale + 40));
            boxH = Math.max(42, (cap.style.fontSize + 22) * scale);
          } else {
            const txt = clip as TextClip;
            displayLabel = txt.content || 'عنوان';
            boxW = Math.max(130, Math.min(canvasWidth * 0.88 * scale, displayLabel.length * 14 * scale + 36));
            boxH = Math.max(38, (txt.style.fontSize + 20) * scale);
          }

          return (
            <div
              key={clip.id}
              onMouseDown={(e) => handleDragOverlayStart(e, clip)}
              style={{
                position: 'absolute',
                left: centerX - boxW / 2,
                top: centerY - boxH / 2,
                width: boxW,
                height: boxH,
                borderRadius: 10,
                border: isSelected
                  ? `2px solid ${isCaption ? '#10B981' : '#EC4899'}`
                  : '1.5px dashed rgba(255,255,255,0.3)',
                boxShadow: isSelected
                  ? `0 0 18px ${isCaption ? 'rgba(16,185,129,0.5)' : 'rgba(236,72,153,0.5)'}`
                  : 'none',
                cursor: 'grab',
                pointerEvents: 'auto',
                zIndex: isSelected ? 45 : 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
              }}
              title="اضغط واسحب لتغيير مكان الكابشن بالفيديو"
            >
              {/* Drag instruction badge */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: -26,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: isCaption ? '#10B981' : '#EC4899',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  cursor: 'grab',
                }}>
                  <Move size={10} />
                  <span>اسحب لتغيير الموضع</span>
                </div>
              )}

              {/* On-screen quick delete button */}
              {isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeClip(clip.id);
                    clearSelection();
                  }}
                  style={{
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#EF4444',
                    border: '2px solid #fff',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                  }}
                  title="حذف هذا العنصر (Delete)"
                >
                  <Trash2 size={11} />
                </button>
              )}

              {/* Corner drag handles */}
              {isSelected && (
                <>
                  <div style={{ position: 'absolute', top: -3, left: -3, width: 6, height: 6, background: '#fff', borderRadius: 1 }} />
                  <div style={{ position: 'absolute', top: -3, right: -3, width: 6, height: 6, background: '#fff', borderRadius: 1 }} />
                  <div style={{ position: 'absolute', bottom: -3, left: -3, width: 6, height: 6, background: '#fff', borderRadius: 1 }} />
                  <div style={{ position: 'absolute', bottom: -3, right: -3, width: 6, height: 6, background: '#fff', borderRadius: 1 }} />
                </>
              )}
            </div>
          );
        })}

        {/* ── Social UI Overlay (Optional TikTok/Reels guides) ── */}
        {showSocialOverlay && (
          <div className="social-preview-overlay">
            <div style={{ display: 'flex', justifyContent: 'center', opacity: 0.85 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#fff',
                background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 10,
              }}>
                Following | <span style={{ textDecoration: 'underline' }}>For You</span>
              </span>
            </div>

            <div className="social-sidebar-actions">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={18} fill="#fff" />
                </div>
                <span style={{ fontSize: 9, fontWeight: 700 }}>248K</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={18} fill="#fff" />
                </div>
                <span style={{ fontSize: 9, fontWeight: 700 }}>1.4K</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Share2 size={18} fill="#fff" />
                </div>
                <span style={{ fontSize: 9, fontWeight: 700 }}>Share</span>
              </div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#111', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 3s linear infinite' }}>
                <Disc3 size={16} color="#8B5CF6" />
              </div>
            </div>

            <div style={{ paddingBottom: 8, paddingRight: 45 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                @ReelCreator
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', marginTop: 2, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                #viral #ai #reels #explore
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modern Floating Glass Player Controls ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        width: 'min(100%, 440px)', flexShrink: 0,
        background: 'rgba(19, 21, 32, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--bg-border)',
        borderRadius: 14,
        padding: '10px 14px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
      }}>
        {/* Scrub Bar */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            setCurrentTime((project?.duration ?? 0) * ratio);
          }}
          style={{
            height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3,
            cursor: 'pointer', position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #6366F1, #EC4899)',
            borderRadius: 3,
            boxShadow: '0 0 8px rgba(99,102,241,0.6)',
          }} />
        </div>

        {/* Buttons Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
          {/* Social overlay toggle */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowSocialOverlay(!showSocialOverlay)}
            title={showSocialOverlay ? 'إخفاء واجهة TikTok' : 'إظهار واجهة TikTok'}
            style={{ fontSize: 10, padding: '3px 8px', gap: 4 }}
          >
            {showSocialOverlay ? <Eye size={12} color="#10B981" /> : <EyeOff size={12} />}
            <span style={{ color: showSocialOverlay ? '#10B981' : 'var(--text-muted)' }}>TikTok UI</span>
          </button>

          {/* Central Playback */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setCurrentTime(0)}>
              <SkipBack size={13} />
            </button>

            <button
              aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              onClick={handlePlayToggle}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                transition: 'transform 100ms ease',
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isPlaying
                ? <Pause size={15} color="#fff" fill="#fff" />
                : <Play size={15} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
              }
            </button>

            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setCurrentTime(project?.duration ?? 0)}
            >
              <SkipForward size={13} />
            </button>
          </div>

          {/* Time & Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span dir="ltr" style={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
              {formatTime(currentTime)} / {formatTime(project?.duration ?? 0)}
            </span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleMute}>
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

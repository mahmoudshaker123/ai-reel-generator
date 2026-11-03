'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Film, Music, Image, Loader2, X } from 'lucide-react';
import { useTimelineStore } from '@/stores/timelineStore';
import { formatBytes, formatTime } from '@/lib/utils';
import { isVideoFile, isAudioFile, isImageFile } from '@/lib/utils';
import { apiMedia, type MediaFileAPI } from '@/lib/api';
import {
  DEFAULT_TRANSFORM, DEFAULT_COLOR_GRADE,
  VideoClip, AudioClip, ImageClip,
} from '@/types/timeline';
import { generateId } from '@/lib/utils';
import { useParams } from 'next/navigation';

// ─── Local representation of uploaded media ──────────────────
interface LocalMedia {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  url: string;         // served URL from Django
  localUrl?: string;   // blob URL for preview while uploading
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  uploading?: boolean;
  uploadError?: string;
}

const TYPE_ICONS = { video: Film, audio: Music, image: Image };

export function MediaPanel() {
  const [mediaItems, setMediaItems] = useState<LocalMedia[]>([]);
  const { project, addClip } = useTimelineStore();
  const params = useParams();
  const projectId = params?.projectId as string | undefined;
  const isLocalProject = !projectId || projectId.startsWith('local_');

  useEffect(() => {
    if (!projectId || isLocalProject) return;
    let cancelled = false;
    apiMedia.list(projectId).then(items => {
      if (!cancelled) setMediaItems(items.map(m => ({ id:m.id, name:m.original_name, type:m.media_type,
        url:m.url, size:m.size, duration:m.duration, width:m.video_width, height:m.video_height })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [projectId, isLocalProject]);

  // ── Extract video metadata from a blob URL ───────────────
  const getVideoMeta = (url: string): Promise<{ duration: number; width: number; height: number; thumbnailUrl: string }> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = url;
      video.preload = 'metadata';
      video.muted = true;
      video.onloadedmetadata = () => { video.currentTime = Math.min(0.1, video.duration / 2); };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          thumbnailUrl: canvas.toDataURL('image/jpeg', 0.7),
        });
        video.remove();
      };
      video.onerror = () => resolve({ duration: 0, width: 0, height: 0, thumbnailUrl: '' });
    });
  };

  // ── Drop handler ─────────────────────────────────────────
  const onDrop = useCallback(async (files: File[]) => {
    for (const file of files) {
      const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const localUrl = URL.createObjectURL(file);

      let type: 'video' | 'audio' | 'image' = 'video';
      if (isAudioFile(file)) type = 'audio';
      else if (isImageFile(file)) type = 'image';

      let meta: Partial<LocalMedia> = {};
      if (type === 'video') {
        try { meta = await getVideoMeta(localUrl); } catch { /* ignore */ }
      }

      // Add as uploading placeholder
      setMediaItems(prev => [...prev, {
        id: tempId,
        name: file.name,
        type,
        url: localUrl,
        localUrl,
        size: file.size,
        uploading: true,
        ...meta,
      }]);

      // Upload to Django backend
      try {
        let apiMedia_result: MediaFileAPI;

        if (!isLocalProject && projectId) {
          apiMedia_result = await apiMedia.upload(projectId, file);
        } else {
          apiMedia_result = await apiMedia.uploadGlobal(file);
        }

        // Replace placeholder with real media from API
        setMediaItems(prev => prev.map(m => m.id === tempId ? {
          id: apiMedia_result.id,
          name: apiMedia_result.original_name,
          type: apiMedia_result.media_type,
          url: apiMedia_result.url,
          localUrl,  // keep for preview
          size: apiMedia_result.size,
          duration: apiMedia_result.duration ?? meta.duration,
          width: apiMedia_result.video_width ?? (meta as { width?: number }).width,
          height: apiMedia_result.video_height ?? (meta as { height?: number }).height,
          thumbnailUrl: (meta as { thumbnailUrl?: string }).thumbnailUrl,
          uploading: false,
        } : m));

      } catch (err) {
        console.warn('Upload to backend failed, using local file:', err);
        // A failed upload must not become an unpersistable timeline asset.
        setMediaItems(prev => prev.map(m => m.id === tempId ? {
          ...m,
          uploading: false,
          uploadError: 'فشل رفع الملف؛ حاول مرة أخرى',
        } : m));
      }
    }
  }, [projectId, isLocalProject]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.webm', '.mov', '.avi'],
      'audio/*': ['.mp3', '.wav', '.aac', '.m4a'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    },
  });

  // ── Drag clip to timeline ────────────────────────────────
  const handleDragToTimeline = (e: React.DragEvent, item: LocalMedia) => {
    e.dataTransfer.setData('application/reel-media', JSON.stringify({
      id: item.id,
      type: item.type,
      url: item.url,
      name: item.name,
      duration: item.duration,
      thumbnailUrl: item.thumbnailUrl,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // ── Add clip directly on click ────────────────────────────
  const handleAddToTimeline = (item: LocalMedia) => {
    if (!project) return;

    const videoTrack = project.tracks.find(t => t.type === item.type) || useTimelineStore.getState().addTrack(item.type);
    if (!videoTrack) return;

    const existingClips = videoTrack.clips;
    const startTime = existingClips.length > 0
      ? Math.max(...existingClips.map(c => c.startTime + c.duration))
      : 0;
    const duration = item.duration || 5;

    if (item.type === 'video') {
      addClip(videoTrack.id, {
        type: 'video',
        startTime,
        duration,
        locked: false,
        effects: [],
        animations: [],
        transitions: {},
        mediaFileId: item.id,
        mediaUrl: item.url,
        thumbnailUrl: item.thumbnailUrl,
        trimStart: 0,
        trimEnd: duration,
        volume: 1,
        muted: false,
        audioFade: { fadeIn: 0, fadeOut: 0 },
        playbackSpeed: 1,
        colorGrade: { ...DEFAULT_COLOR_GRADE },
        transform: { ...DEFAULT_TRANSFORM },
      } as Omit<VideoClip, 'id' | 'trackId' | 'order'>);
    } else if (item.type === 'audio') {
      addClip(videoTrack.id, {
        type: 'audio',
        startTime,
        duration,
        locked: false,
        effects: [],
        animations: [],
        transitions: {},
        mediaFileId: item.id,
        mediaUrl: item.url,
        trimStart: 0,
        trimEnd: duration,
        volume: 1,
        muted: false,
        audioFade: { fadeIn: 0, fadeOut: 0 },
        label: 'background_music',
      } as Omit<AudioClip, 'id' | 'trackId' | 'order'>);
    } else if (item.type === 'image') {
      addClip(videoTrack.id, {
        type: 'image',
        startTime,
        duration: 3,
        locked: false,
        effects: [],
        animations: [],
        transitions: {},
        mediaFileId: item.id,
        mediaUrl: item.url,
        transform: { ...DEFAULT_TRANSFORM },
      } as Omit<ImageClip, 'id' | 'trackId' | 'order'>);
    }
  };

  const removeMedia = async (id: string) => {
    if (project?.tracks.some(t => t.clips.some(c => 'mediaFileId' in c && c.mediaFileId === id))) {
      alert('احذف مقاطع الملف من التايملاين أولاً.'); return;
    }
    if (projectId && !id.startsWith('tmp_')) {
      try { await apiMedia.delete(projectId, id); }
      catch (e) { alert(e instanceof Error ? e.message : 'تعذر حذف الملف'); return; }
    }
    const item = mediaItems.find(m => m.id === id);
    if (item?.localUrl) URL.revokeObjectURL(item.localUrl);
    setMediaItems(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Upload drop zone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? '#8B5CF6' : 'var(--bg-border)'}`,
          borderRadius: 10,
          padding: '20px 12px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragActive ? 'rgba(139,92,246,0.05)' : 'var(--bg-elevated)',
          transition: 'all 150ms ease',
        }}
      >
        <input {...getInputProps()} />
        <Upload size={20} color={isDragActive ? '#8B5CF6' : 'var(--text-muted)'} style={{ margin: '0 auto 8px' }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: isDragActive ? '#8B5CF6' : 'var(--text-secondary)' }} dir="rtl">
          {isDragActive ? 'أسقط الملف هنا' : 'ارفع فيديو، صوت أو صورة'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          MP4, MOV, MP3, JPG, PNG
        </div>
        {!isLocalProject && (
          <div style={{ fontSize: 10, color: '#8B5CF6', marginTop: 4 }}>
            ✓ يُرفع مباشرة إلى الـ Server
          </div>
        )}
      </div>

      {/* Media list */}
      {mediaItems.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>
            مكتبة الميديا ({mediaItems.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {mediaItems.map(item => {
              const Icon = TYPE_ICONS[item.type];
              return (
                <div
                  key={item.id}
                  draggable={!item.uploading && !item.uploadError}
                  onDragStart={(e) => handleDragToTimeline(e, item)}
                  onClick={() => !item.uploading && !item.uploadError && handleAddToTimeline(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 8,
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${item.uploadError ? 'rgba(245,158,11,0.4)' : 'var(--bg-border)'}`,
                    cursor: item.uploading ? 'not-allowed' : 'grab',
                    transition: 'all 150ms ease',
                    position: 'relative',
                    opacity: item.uploading ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!item.uploading) (e.currentTarget.style.borderColor = '#8B5CF6'); }}
                  onMouseLeave={e => { (e.currentTarget.style.borderColor = item.uploadError ? 'rgba(245,158,11,0.4)' : 'var(--bg-border)'); }}
                >
                  {/* Thumbnail or icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                    background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.thumbnailUrl
                      ? <img src={item.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Icon size={16} color="var(--text-muted)" />
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }} dir="rtl">
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 10, color: item.uploadError ? '#F59E0B' : 'var(--text-muted)' }}>
                      {item.uploading ? '↑ جاري الرفع...' : item.uploadError ? item.uploadError : `${item.duration ? formatTime(item.duration) : ''} ${formatBytes(item.size)}`}
                    </div>
                  </div>

                  {/* Upload spinner or remove button */}
                  {item.uploading ? (
                    <Loader2 size={14} className="animate-spin" color="#8B5CF6" style={{ flexShrink: 0 }} />
                  ) : (
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0 }}
                      onClick={e => { e.stopPropagation(); removeMedia(item.id); }}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mediaItems.length === 0 && !isDragActive && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }} dir="rtl">
          <Film size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
          لا توجد ميديا بعد
        </div>
      )}
    </div>
  );
}

'use client';

import { Track } from '@/types/timeline';
import { useTimelineStore } from '@/stores/timelineStore';
import { useSelectionStore } from '@/stores/selectionStore';
import {
  Eye, EyeOff, Volume2, VolumeX, Lock, Unlock,
  Video, Music, Type, Captions, Image, Zap,
} from 'lucide-react';

const TRACK_ICONS = {
  video: Video,
  audio: Music,
  text: Type,
  caption: Captions,
  image: Image,
  effect: Zap,
};

const TRACK_COLORS = {
  video: '#8B5CF6',
  audio: '#06B6D4',
  text: '#F59E0B',
  caption: '#10B981',
  image: '#EC4899',
  effect: '#6366F1',
};

interface TimelineControlsProps {
  track: Track;
}

export function TimelineControls({ track }: TimelineControlsProps) {
  const { updateTrack } = useTimelineStore();
  const { selectedTrackId, selectTrack } = useSelectionStore();

  const Icon = TRACK_ICONS[track.type] ?? Video;
  const color = TRACK_COLORS[track.type] ?? '#8B5CF6';
  const isSelected = selectedTrackId === track.id;

  return (
    <div
      className="timeline-track-controls"
      style={{
        height: 56,
        background: isSelected ? 'var(--bg-hover)' : 'var(--bg-panel)',
        cursor: 'pointer',
        borderBottom: '1px solid var(--bg-border)',
      }}
      onClick={() => selectTrack(track.id)}
    >
      {/* Track type icon */}
      <div style={{
        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
        background: `${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={11} color={color} />
      </div>

      {/* Track name */}
      <span style={{
        fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)',
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {track.name}
      </span>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 2 }}>
        <button
          className="btn btn-ghost btn-icon"
          style={{ width: 20, height: 20, borderRadius: 3 }}
          title={track.hidden ? 'إظهار' : 'إخفاء'}
          onClick={e => { e.stopPropagation(); updateTrack(track.id, { hidden: !track.hidden }); }}
        >
          {track.hidden
            ? <EyeOff size={10} color="var(--text-muted)" />
            : <Eye size={10} color="var(--text-muted)" />
          }
        </button>
        {(track.type === 'video' || track.type === 'audio') && (
          <button
            className="btn btn-ghost btn-icon"
            style={{ width: 20, height: 20, borderRadius: 3 }}
            title={track.muted ? 'رفع الكتم' : 'كتم'}
            onClick={e => { e.stopPropagation(); updateTrack(track.id, { muted: !track.muted }); }}
          >
            {track.muted
              ? <VolumeX size={10} color="#EF4444" />
              : <Volume2 size={10} color="var(--text-muted)" />
            }
          </button>
        )}
        <button
          className="btn btn-ghost btn-icon"
          style={{ width: 20, height: 20, borderRadius: 3 }}
          title={track.locked ? 'فك القفل' : 'قفل'}
          onClick={e => { e.stopPropagation(); updateTrack(track.id, { locked: !track.locked }); }}
        >
          {track.locked
            ? <Lock size={10} color="var(--color-warning)" />
            : <Unlock size={10} color="var(--text-muted)" />
          }
        </button>
      </div>
    </div>
  );
}

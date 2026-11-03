'use client';

interface PlayheadProps {
  currentTime: number;
  zoom: number;
  totalHeight: number;
}

export function Playhead({ currentTime, zoom, totalHeight }: PlayheadProps) {
  const x = currentTime * zoom;

  return (
    <div
      className="playhead"
      style={{
        left: x,
        top: 0,
        height: totalHeight,
        pointerEvents: 'none',
        willChange: 'transform',
        position: 'absolute',
        zIndex: 20,
      }}
    >
      {/* Head triangle */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '8px solid var(--playhead-color)',
      }} />
      {/* Line */}
      <div style={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 2,
        bottom: 0,
        background: 'var(--playhead-color)',
        opacity: 0.8,
      }} />
    </div>
  );
}

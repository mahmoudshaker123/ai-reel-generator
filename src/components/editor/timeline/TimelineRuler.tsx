'use client';

import { formatTime } from '@/lib/utils';

interface TimelineRulerProps {
  zoom: number;       // pixels per second
  duration: number;   // total seconds
  onClick: (e: React.MouseEvent) => void;
}

export function TimelineRuler({ zoom, duration, onClick }: TimelineRulerProps) {
  // Adaptive tick interval based on zoom level
  const getTickInterval = () => {
    if (zoom >= 200) return 0.5;   // every 0.5s
    if (zoom >= 100) return 1;     // every 1s
    if (zoom >= 50)  return 2;     // every 2s
    if (zoom >= 25)  return 5;     // every 5s
    return 10;                     // every 10s
  };

  const interval = getTickInterval();
  const ticks: number[] = [];
  for (let t = 0; t <= duration + interval; t += interval) {
    ticks.push(parseFloat(t.toFixed(3)));
  }

  const labelEvery = Math.max(1, Math.ceil(50 / (zoom * interval)));

  return (
    <div
      className="timeline-ruler"
      style={{ height: 28, cursor: 'pointer' }}
      onClick={onClick}
    >
      <svg
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
        width={duration * zoom + 300}
        height={28}
      >
        {ticks.map((t, i) => {
          const x = t * zoom;
          const isMajor = i % labelEvery === 0;
          return (
            <g key={t}>
              <line
                x1={x} y1={isMajor ? 10 : 18}
                x2={x} y2={28}
                stroke={isMajor ? '#444455' : '#2A2A3A'}
                strokeWidth={1}
              />
              {isMajor && (
                <text
                  x={x + 3} y={9}
                  fill="#606075"
                  fontSize={9}
                  fontFamily="monospace"
                >
                  {formatTime(t)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

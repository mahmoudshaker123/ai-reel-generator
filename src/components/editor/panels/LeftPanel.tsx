'use client';

import { useUIStore, LeftPanelTab } from '@/stores/uiStore';
import { MediaPanel } from './MediaPanel';
import { TextPanel } from './TextPanel';
import { AudioPanel } from './AudioPanel';
import { CaptionsPanel } from './CaptionsPanel';
import { EffectsPanel } from './EffectsPanel';
import { AIPanel } from './AIPanel';
import {
  Film, Type, Music, Captions, Sparkles, Wand2,
} from 'lucide-react';

const TABS: { id: LeftPanelTab; icon: React.ReactNode; label: string }[] = [
  { id: 'media',    icon: <Film size={17} />,     label: 'ميديا' },
  { id: 'text',     icon: <Type size={17} />,     label: 'نص' },
  { id: 'audio',    icon: <Music size={17} />,    label: 'صوت' },
  { id: 'captions', icon: <Captions size={17} />, label: 'كابشن' },
  { id: 'effects',  icon: <Wand2 size={17} />,    label: 'تأثير' },
  { id: 'ai',       icon: <Sparkles size={17} />, label: 'AI' },
];

const PANEL_MAP: Record<LeftPanelTab, React.ReactNode> = {
  media:    <MediaPanel />,
  text:     <TextPanel />,
  audio:    <AudioPanel />,
  captions: <CaptionsPanel />,
  effects:  <EffectsPanel />,
  ai:       <AIPanel />,
};

export function LeftPanel() {
  const { activeLeftTab, setActiveLeftTab } = useUIStore();

  return (
    <div className="editor-left-panel">
      {/* Tabs */}
      <div className="panel-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`panel-tab ${activeLeftTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveLeftTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {PANEL_MAP[activeLeftTab]}
      </div>
    </div>
  );
}

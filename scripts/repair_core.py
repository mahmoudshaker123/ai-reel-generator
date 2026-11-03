from pathlib import Path

def edit(name, fn):
    p = Path(name)
    p.write_text(fn(p.read_text(encoding='utf-8')), encoding='utf-8')

edit('src/components/editor/preview/PreviewArea.tsx', lambda s: s.replace("import { formatTime }", "import { formatTime }")
    .replace("const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());", "const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());")
    .replace("return `http://localhost:8001${url}`;", "return url;")
    .replace("if (clip.type === 'video') {\n          neededIds", "if (clip.type === 'video' || clip.type === 'audio') {\n          neededIds")
    .replace("video.src = fullUrl;\n            video.crossOrigin = 'anonymous';", "video.crossOrigin = 'anonymous';\n            video.src = fullUrl;\n            video.dataset.source = fullUrl;")
    .replace("video.preload = 'auto';", "video.preload = 'auto';\n            video.onloadedmetadata = () => { video.currentTime = clip.trimStart; };\n            video.onseeked = () => renderFrame(usePlaybackStore.getState().currentTime);")
    .replace("existingVideo.src !== fullUrl", "existingVideo.dataset.source !== fullUrl")
    .replace("existingVideo.src = fullUrl;", "existingVideo.src = fullUrl;\n              existingVideo.dataset.source = fullUrl;")
    .replace("  }, [project, isMuted, volume]);", "  }, [project]);\n\n  useEffect(() => {\n    const elements = videoRefs.current;\n    return () => {\n      for (const el of elements.values()) { el.pause(); el.removeAttribute('src'); el.load(); el.remove(); }\n      elements.clear();\n      usePlaybackStore.getState().setIsPlaying(false);\n    };\n  }, []);")
    .replace("videoEl.readyState >= 1", "videoEl.readyState >= 2")
    .replace("const sourceTime = clip.trimStart + clipLocalTime;", "const sourceTime = clip.trimStart + clipLocalTime * (clip.playbackSpeed || 1);")
    .replace("if (Math.abs(videoEl.currentTime - sourceTime) > driftThreshold)", "if (!currentlyPlaying && !videoEl.seeking && Math.abs(videoEl.currentTime - sourceTime) > driftThreshold)")
    .replace("ctx.drawImage(videoEl, dx, dy, dw, dh);", "const fit = Math.min(dw / videoEl.videoWidth, dh / videoEl.videoHeight);\n              const vw = videoEl.videoWidth * fit, vh = videoEl.videoHeight * fit;\n              ctx.drawImage(videoEl, dx + (dw - vw) / 2, dy + (dh - vh) / 2, vw, vh);")
    .replace("setScale(Math.min(scaleH, scaleW, 0.95));", "setScale(Math.max(0.02, Math.min(scaleH, scaleW, 0.95)));")
    .replace("<div className=\"phone-dynamic-island\" />", "")
    .replace("width: Math.min(canvasWidth * scale + 36, 360),", "width: 'min(100%, 440px)', flexShrink: 0,")
    .replace("<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>", "<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>")
    .replace("onClick={handlePlayToggle}", "aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}\n              onClick={handlePlayToggle}")
)

p = Path('src/components/editor/preview/PreviewArea.tsx')
s = p.read_text(encoding='utf-8')
a = s.index('  const frameInterval =')
b = s.index('  // ── Responsive Scaling', a)
s = s[:a] + '''  useEffect(() => {
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

''' + s[b:]
p.write_text(s, encoding='utf-8')

# Preserve source timing when cuts remove time from the edited timeline.
p = Path('backend/api/reel_generator.py'); s = p.read_text(encoding='utf-8')
a=s.index('    elif intents[\'remove_silence\'] and raw_duration > 6.0:'); b=s.index('    else:',a)
s=s[:a]+s[b:]
a=s.index('        else:\n            # Fallback placeholder'); b=s.index('        caption_clips.append',a)
s=s[:a]+s[b:]
s=s.replace("    raw_duration = media_file.duration or 15.0", "    raw_duration = media_file.duration\n    if not raw_duration or raw_duration <= 0:\n        raise ValueError('تعذر قراءة مدة الفيديو. ارفع ملف فيديو صالحًا.')")
a=s.index('    # ── Attempt Real'); b=s.index('    # ── 1.',a)
s=s[:a]+'''    gemini_data = None
    if any(intents[k] for k in ('remove_silence', 'add_captions', 'add_shapes')):
        res = analyze_video_with_gemini(file_path, prompt_text)
        if not res.get('success'):
            raise ValueError(res.get('message', 'تعذر تحليل الفيديو.'))
        gemini_data = res
        actions_taken.append(f"تم التحليل بواسطة {res.get('model')}")

'''+s[b:]
s=s.replace("silences = gemini_data['silence_intervals']", "silences = sorted(gemini_data['silence_intervals'], key=lambda g: float(g.get('startTime', 0)))")
s=s.replace("g_start = float(gap.get('startTime', 0))", "g_start = max(0, min(raw_duration, float(gap.get('startTime', 0))))")
s=s.replace("g_end = float(gap.get('endTime', 0))", "g_end = max(g_start, min(raw_duration, float(gap.get('endTime', 0))))")
s=s.replace('last_speech_start = g_end', 'last_speech_start = max(last_speech_start, g_end)')
a=s.index("        if gemini_data and gemini_data.get('segments'):"); b=s.index('        caption_clips.append',a)
s=s[:a]+'''        if gemini_data:
            for source in gemini_data.get('segments', []):
                for video in video_clips:
                    start = max(float(source['startTime']), video['trimStart'])
                    end = min(float(source['endTime']), video['trimEnd'])
                    if end <= start:
                        continue
                    offset = video['startTime'] - video['trimStart']
                    words = [{**w, 'startTime': max(start, float(w['startTime'])) + offset,
                              'endTime': min(end, float(w['endTime'])) + offset}
                             for w in source.get('words', [])
                             if float(w['endTime']) > start and float(w['startTime']) < end]
                    segments.append({'id': uuid.uuid4().hex, 'text': ' '.join(w['word'] for w in words) or source['text'],
                                     'startTime': start + offset, 'endTime': end + offset, 'words': words})

'''+s[b:]
p.write_text(s,encoding='utf-8')

# Durable URLs rather than browser-only object URLs in saved timelines.
edit('src/components/editor/panels/MediaPanel.tsx', lambda s:s.replace('useCallback, useState', 'useCallback, useState, useEffect').replace('item.localUrl || item.url','item.url').replace("video.currentTime = 0.5", "video.currentTime = Math.min(0.1, video.duration / 2)").replace("const videoTrack = project.tracks.find(t => t.type === item.type);", "const videoTrack = project.tracks.find(t => t.type === item.type) || useTimelineStore.getState().addTrack(item.type);").replace(' + 0.1\n      : 0','\n      : 0'))
edit('src/components/modals/GeminiKeyModal.tsx', lambda s:s.replace("import React,", "import { createPortal } from 'react-dom';\nimport React,").replace('  return (\n    <div style=', '  return createPortal(\n    <div role="dialog" aria-modal="true" aria-label="إعدادات Gemini" style=').replace('    </div>\n  );', '    </div>, document.body\n  );').replace('type="text"','type="password" autoComplete="off"').replace('اشتراك Google Gemini AI','ربط Gemini API').replace('تفريغ صوتك الحقيقي بالمللي وقص فترات السكوت وصناعة الهوك','مفتاح من Google AI Studio لتحليل الصوت وتوليد الكابشن').replace('✨ مفتاحك متصل ومفعّل بنجاح (جاهز للاستخدام)','يوجد مفتاح محفوظ على هذا الجهاز'))

'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTimelineStore } from '@/stores/timelineStore';
import { useHistoryStore } from '@/stores/historyStore';
import { usePlaybackStore } from '@/stores/playbackStore';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { apiProjects } from '@/lib/api';
import { Project } from '@/types/timeline';

export default function EditorPage() {
  const { projectId } = useParams<{projectId:string}>();
  const router = useRouter();
  const { project, isDirty } = useTimelineStore();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    usePlaybackStore.getState().setIsPlaying(false);
    useHistoryStore.getState().clearHistory();
    (async () => {
      if (projectId.startsWith('new_') || projectId.startsWith('local_')) {
        const created = await apiProjects.create({title:'مشروع جديد'});
        if (!cancelled) router.replace(`/editor/${created.id}`);
        return;
      }
      const detail = await apiProjects.get(projectId);
      if (cancelled) return;
      const store = useTimelineStore.getState();
      const timeline = detail.timeline_json && Object.keys(detail.timeline_json).length ? detail.timeline_json as unknown as Project : {...store.newProject(detail.title),id:detail.id};
      store.initProject(timeline);
      setReady(true);
    })().catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل المشروع'); });
    return () => { cancelled = true; };
  }, [projectId, router]);
  useEffect(() => {
    if (!ready || !project || project.id !== projectId || !isDirty) return;
    const snapshot = project;
    const timer = setTimeout(async () => {
      useTimelineStore.getState().setSaving(true);
      try {
        await apiProjects.saveTimeline(projectId, snapshot as unknown as Record<string,unknown>);
        if (useTimelineStore.getState().project === snapshot) useTimelineStore.getState().setDirty(false);
        setError('');
      } catch { setError('تعذر حفظ التعديلات. تحقق من اتصال الخادم.'); }
      finally { useTimelineStore.getState().setSaving(false); }
    }, 800);
    return () => clearTimeout(timer);
  }, [ready,project,projectId,isDirty]);
  useEffect(() => {
    const warn = (e:BeforeUnloadEvent) => { if(useTimelineStore.getState().isDirty) e.preventDefault(); };
    window.addEventListener('beforeunload',warn);
    return () => window.removeEventListener('beforeunload',warn);
  },[]);
  if (!ready || project?.id !== projectId) return <div className="flex-center" style={{minHeight:'100dvh',flexDirection:'column',gap:20}}><p>{error || 'جاري تحميل المشروع…'}</p>{error && <button className="btn btn-primary" onClick={() => router.push('/')}>العودة للمشاريع</button>}</div>;
  return <>{error && <div role="alert" style={{position:'fixed',bottom:12,left:12,zIndex:100,background:'#722e29',padding:12,borderRadius:8}}>{error}</div>}<EditorLayout /></>;
}

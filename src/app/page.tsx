'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Film, Plus, ArrowUpLeft, Upload, Sparkles, Scissors, Captions, FolderOpen, Trash2, Loader2, Check, Settings2 } from 'lucide-react';
import { apiProjects, apiGenerateReel, apiGemini, type ProjectMeta } from '@/lib/api';
import { GeminiKeyModal } from '@/components/modals/GeminiKeyModal';
import { formatTime } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('احذف فترات السكوت وأضف كابشن عربي وعنوان مناسب للفيديو');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [modal, setModal] = useState(false);
  const [configured, setConfigured] = useState(false);
  async function refreshKey() { try { setConfigured((await apiGemini.getStatus()).configured); } catch { setConfigured(false); } }
  useEffect(() => {
    apiProjects.list().then(setProjects).catch(() => setError('تعذر الاتصال بالخادم. تأكد من تشغيل الخلفية ثم أعد المحاولة.')).finally(() => setLoading(false));
    apiGemini.getStatus().then(status => setConfigured(status.configured)).catch(() => setConfigured(false));
  }, []);
  function chooseFile(value?: File) {
    if (!value) return;
    if (!/\.(mp4|mov|webm|mkv|avi)$/i.test(value.name)) return setError('اختر ملف فيديو MP4 أو MOV أو WebM.');
    if (value.size > 500 * 1024 * 1024) return setError('الحد الأقصى للفيديو 500 MB.');
    setError(''); setFile(value);
  }
  async function newProject() {
    if (busy) return;
    setBusy(true); setError('');
    try { const p = await apiProjects.create({ title: 'مشروع جديد' }); router.push(`/editor/${p.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر إنشاء المشروع'); setBusy(false); }
  }
  async function generate() {
    if (!file || busy) return;
    setBusy(true); setError('');
    try { const p = await apiGenerateReel({ video: file, prompt, title: file.name.replace(/\.[^.]+$/, '') }); router.push(`/editor/${p.project_id}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحليل الفيديو'); setBusy(false); }
  }
  async function remove(p: ProjectMeta) {
    if (!confirm(`حذف مشروع «${p.title}»؟`)) return;
    try { await apiProjects.delete(p.id); setProjects(items => items.filter(item => item.id !== p.id)); }
    catch { setError('تعذر حذف المشروع. حاول مرة أخرى.'); }
  }
  return <div className="dashboard-layout">
    <header className="studio-header"><Link href="/" className="studio-brand"><span className="brand-mark"><Film size={22} /></span><span>reel<span className="brand-light">studio</span><small>مساحة لصناعة حكايتك</small></span></Link>
      <div className="header-actions"><button className="btn btn-surface" onClick={() => setModal(true)}><span className={`status-dot ${configured ? 'connected' : ''}`} /> Gemini <Settings2 size={15} /></button><button className="btn btn-primary" disabled={busy} onClick={newProject}><Plus size={17} /> مشروع جديد</button></div>
    </header>
    <main className="studio-main">
      <section className="studio-intro"><div><span className="eyebrow">YOUR NEXT GREAT REEL</span><h1>فكرتك تستحق<br /><span>لقطة أحلى.</span></h1><p>من الفيديو الخام إلى حكاية تستاهل تتشاف.<br />ارفع، رتّب، وأضف لمستك — في مساحة واحدة.</p></div><div className="intro-note"><span>01 — 03</span><p>ابدأ بلقطة.<br />والباقي في إيدك.</p><ArrowUpLeft size={30} /></div></section>
      <section className="create-workspace">
        <div className={`upload-zone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files[0]); }}>
          <input ref={input} type="file" accept="video/*" hidden onChange={e => chooseFile(e.target.files?.[0])} />
          <div className="upload-art"><Film size={46} strokeWidth={1.2} /><span><Plus size={18} /></span></div>
          <span className="eyebrow">01 / الفيديو</span><h2>{file ? 'الفيديو جاهز للخطوة الجاية' : 'ابدأ بالفيديو بتاعك'}</h2><p className="file-name">{file ? file.name : 'اسحب الفيديو هنا أو اختاره من جهازك'}</p>
          <button className="btn btn-surface" disabled={busy} onClick={() => input.current?.click()}><Upload size={17} /> {file ? 'تغيير الفيديو' : 'اختيار فيديو'}</button><small>{file ? `${(file.size / 1048576).toFixed(1)} MB` : 'MP4 · MOV · WebM / حتى 500 MB'}</small>
        </div>
        <div className="prompt-panel"><span className="eyebrow">02 / اللمسة الإبداعية</span><h2>إيه اللي في بالك؟</h2><p>وصف بسيط للتعديلات، وبعدها راجع كل تفصيلة في المحرر.</p><label htmlFor="reel-prompt" className="sr-only">وصف التعديلات</label><textarea id="reel-prompt" className="input" value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} />
          <div className="prompt-chips">{[{Icon:Scissors,text:'احذف فترات السكوت'}, {Icon:Captions,text:'أضف كابشن عربي'}, {Icon:Sparkles,text:'أضف عنوان جذاب'}].map(({Icon,text}) => <button key={text} onClick={() => setPrompt(p => p.includes(text) ? p : `${p}، ${text}`)}><Icon size={14} />{text}</button>)}</div>
          <button className="btn btn-primary generate-button" disabled={!file || !prompt.trim() || busy} onClick={generate}>{busy ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}{busy ? 'جاري تجهيز مشروعك…' : 'تجهيز الريل'}<ArrowUpLeft size={18} /></button>
          <button className="connection-note" onClick={() => setModal(true)}>{configured ? <Check size={14} /> : <Settings2 size={14} />}{configured ? 'مفتاح Gemini محفوظ · راجع الكابشن قبل النشر' : 'اربط Gemini لتفعيل التحليل والكابشن'}</button>
        </div>
      </section>
      {error && <div role="alert" className="studio-error">{error}<button onClick={() => setError('')} aria-label="إغلاق الرسالة">×</button></div>}
      <section className="projects-section"><div className="section-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>مشاريعك <span>{projects.length}</span></h2></div><button className="btn btn-ghost" disabled={busy} onClick={newProject}><Plus size={16} /> محرر فارغ</button></div>
        {loading ? <p className="empty-projects">جاري تحميل المشاريع…</p> : !projects.length ? <div className="empty-projects"><FolderOpen size={30} /><h3>مساحة فاضية لفكرتك الجاية</h3><p>ابدأ أول مشروع، وهتلاقي شغلك محفوظ هنا.</p></div> : <div className="projects-grid">{projects.map((p, i) => <article key={p.id} className="studio-project"><button className="project-open" onClick={() => router.push(`/editor/${p.id}`)}><div className={`project-cover cover-${i % 3}`}><Film size={34} strokeWidth={1} /><span>{formatTime(p.duration)}</span><ArrowUpLeft size={22} /></div><h3>{p.title}</h3><p>{new Date(p.updated_at).toLocaleDateString('ar-EG')} · {p.aspect_ratio}</p></button><button className="project-delete" onClick={() => remove(p)} aria-label={`حذف ${p.title}`}><Trash2 size={15} /></button></article>)}</div>}
      </section><footer className="studio-footer"><span>reelstudio</span><span>كل حكاية بتبدأ بلقطة.</span></footer>
    </main><GeminiKeyModal isOpen={modal} onClose={() => setModal(false)} onSuccess={refreshKey} />
  </div>;
}

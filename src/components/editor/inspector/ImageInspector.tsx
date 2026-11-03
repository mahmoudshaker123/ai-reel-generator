'use client';
import { ImageClip } from '@/types/timeline';
import { useTimelineStore } from '@/stores/timelineStore';
import { useSelectionStore } from '@/stores/selectionStore';

export function ImageInspector({clip}:{clip:ImageClip}) {
  const {updateClip,removeClip}=useTimelineStore();
  return <div dir="rtl"><h3 style={{marginBottom:18}}>خصائص الصورة</h3>
    <label className="label">المدة بالثواني</label><input className="input" type="number" min={.1} step={.1} value={clip.duration} onChange={e=>updateClip(clip.id,{duration:Math.max(.1,Number(e.target.value))})}/>
    {([{key:'x',label:'الموضع الأفقي',min:-1080,max:1080},{key:'y',label:'الموضع الرأسي',min:-1920,max:1920},{key:'width',label:'العرض %',min:1,max:200},{key:'height',label:'الارتفاع %',min:1,max:200},{key:'rotation',label:'الدوران',min:-180,max:180},{key:'opacity',label:'الشفافية',min:0,max:1}] as const).map(field=><label key={field.key} className="label" style={{display:'block',marginTop:18}}>{field.label}<input className="input" type="number" min={field.min} max={field.max} step={field.key==='opacity'?.05:1} value={clip.transform[field.key]} onChange={e=>updateClip<ImageClip>(clip.id,{transform:{...clip.transform,[field.key]:Math.min(field.max,Math.max(field.min,Number(e.target.value)))}})}/></label>)}
    <button className="btn btn-surface" style={{marginTop:20}} onClick={()=>{removeClip(clip.id);useSelectionStore.getState().clearSelection();}}>حذف الصورة</button>
  </div>;
}

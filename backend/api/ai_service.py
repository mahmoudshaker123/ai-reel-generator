"""Real Gemini job processing for the editor AI panel."""
import threading
from django.db import close_old_connections
from django.utils import timezone

def process_job(job_id):
    from .models import AIJob
    from .reel_generator import generate_reel_timeline
    close_old_connections()
    job = AIJob.objects.get(id=job_id)
    try:
        job.status='transcribing'; job.progress=10; job.save()
        options=job.options
        requests=[]
        if options.get('removeSilence'): requests.append('احذف فترات السكوت')
        if options.get('addCaptions'): requests.append('أضف كابشن')
        if options.get('autoHook'): requests.append('أضف هوك وعنوان')
        prompt='، '.join(requests) or 'احتفظ بالفيديو الأصلي'
        timeline, actions, intents=generate_reel_timeline(job.media_file,prompt,job.project.title)
        timeline['id']=str(job.project_id)
        job.result_timeline=timeline
        job.editing_plan_json={'actions':actions,'intents':intents}
        job.status='completed'; job.progress=100
    except Exception as error:
        job.status='failed'; job.error_message=str(error)
    finally:
        job.completed_at=timezone.now(); job.save(); close_old_connections()

def start_ai_job(job_id):
    threading.Thread(target=process_job,args=(job_id,),daemon=True).start()

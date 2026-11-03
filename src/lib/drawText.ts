import type { TextStyle } from '@/types/timeline';

/** Wrap Arabic and English text inside the video safe area. */
export function drawText(ctx:CanvasRenderingContext2D, text:string, style:TextStyle, x:number, y:number, maxWidth:number, background:boolean) {
  ctx.save();
  ctx.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize}px '${style.fontFamily}', Arial, sans-serif`;
  ctx.direction=style.direction || 'rtl'; ctx.textAlign='center'; ctx.textBaseline='middle';
  const lines:string[]=[];
  for (const paragraph of text.split('\n')) {
    let line='';
    for(const word of paragraph.split(/\s+/)) {
      const next=line ? `${line} ${word}` : word;
      if(line && ctx.measureText(next).width>maxWidth) {lines.push(line);line=word;} else line=next;
    }
    lines.push(line);
  }
  const lineHeight=style.fontSize*(style.lineHeight || 1.4);
  const pad=style.backgroundPadding || 12;
  const width=Math.min(maxWidth,Math.max(...lines.map(line=>ctx.measureText(line).width)))+pad*2;
  const height=lines.length*lineHeight+pad*2;
  if(background && style.backgroundColor!=='transparent') {
    ctx.save();ctx.globalAlpha*=style.backgroundOpacity ?? .8;
    ctx.fillStyle=style.backgroundColor || '#000';ctx.beginPath();
    ctx.roundRect(x-width/2,y-height/2,width,height,style.backgroundBorderRadius || 8);ctx.fill();ctx.restore();
  }
  ctx.fillStyle=style.color;
  if(style.shadow) {ctx.shadowColor=style.shadow.color;ctx.shadowBlur=style.shadow.blur;ctx.shadowOffsetX=style.shadow.offsetX;ctx.shadowOffsetY=style.shadow.offsetY;}
  lines.forEach((line,index)=>{
    const top=y+(index-(lines.length-1)/2)*lineHeight;
    if(style.stroke?.width) {ctx.lineWidth=style.stroke.width*2;ctx.strokeStyle=style.stroke.color;ctx.strokeText(line,x,top,maxWidth);}
    ctx.fillText(line,x,top,maxWidth);
  });
  ctx.restore();
}

export type Contour = [number,number][];
/** Conservative row-band envelope. No semantic segmentation, no network. */
export function detectContour(data:Uint8ClampedArray,w:number,h:number,background=false):Contour|null {
 if(w<2||h<2||data.length!==w*h*4)return null;
 const corners=[0,w-1,(h-1)*w,w*h-1].map(i=>[data[i*4],data[i*4+1],data[i*4+2]]);
 const bg=corners[0];const uniform=corners.every(c=>c.every((v,k)=>Math.abs(v-bg[k])<16));
 let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]<32)transparent++;
 if(transparent<w*h*.02&&(!background||!uniform))return null;
 const solid=(x:number,y:number)=>{const i=(y*w+x)*4;return data[i+3]>24&&!(transparent<w*h*.02&&background&&[0,1,2].every(k=>Math.abs(data[i+k]-bg[k])<24));};
 const left:Contour=[],right:Contour=[];let occupied=0;
 const step=Math.max(1,Math.ceil(h/64));
 for(let y=0;y<h;y+=step){let lo=w,hi=-1;for(let yy=y;yy<Math.min(h,y+step);yy++)for(let x=0;x<w;x++)if(solid(x,yy)){lo=Math.min(lo,x);hi=Math.max(hi,x);occupied++;}if(hi>=0){left.push([lo/w*100,y/h*100],[lo/w*100,Math.min(h,y+step)/h*100]);right.push([(hi+1)/w*100,y/h*100],[(hi+1)/w*100,Math.min(h,y+step)/h*100]);}}
 if(occupied<w*h*.01||occupied>w*h*.97)return null;
 return [...left,...right.reverse()];
}
export function wrapShape(contour:Contour|undefined,width:number,height:number,top:number):string {
 return contour?.length?`polygon(${contour.map(([x,y])=>`${x/100*width}px ${top+y/100*height}px`).join(',')})`:`inset(${top}px 0 0 0)`;
}
export async function analyzeLocalImage(src:string,background=false):Promise<Contour|null>{
 if(!src.startsWith('data:image/'))return null;
 return new Promise(resolve=>{const im=new Image();im.onerror=()=>resolve(null);im.onload=()=>{try{const scale=Math.min(1,256/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.max(2,Math.round(im.width*scale));c.height=Math.max(2,Math.round(im.height*scale));const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx){resolve(null);return;}ctx.drawImage(im,0,0,c.width,c.height);resolve(detectContour(ctx.getImageData(0,0,c.width,c.height).data,c.width,c.height,background));}catch{resolve(null);}};im.src=src;});
}

export type ImagePlacement={x:number;y:number;width:number;height:number};
export function assertImagePlacement(value:unknown): asserts value is ImagePlacement {
 const p=value as ImagePlacement;
 if(!p||!['x','y','width','height'].every(k=>typeof p[k as keyof ImagePlacement]==='number'&&Number.isFinite(p[k as keyof ImagePlacement]))||p.x< -200||p.x>100||p.y< -200||p.y>100||p.width<=0||p.width>200||p.height<=0||p.height>200)throw new Error('Invalid image placement');
}
export function placementStyle(p:ImagePlacement){return {left:`${p.x}%`,top:`${p.y}%`,width:`${p.width}%`,height:`${p.height}%`};}

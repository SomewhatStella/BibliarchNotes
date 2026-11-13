import {readFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import test from 'node:test';
function load(path){const exports={};new Function('exports',ts.transpile(readFileSync(path,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}))(exports);return exports;}
const drawing=load('src/lib/drawing.ts'),snap=load('src/lib/smart-snap.ts'),charts=load('src/lib/charts.ts'),shapes=load('src/lib/shapes.ts'),tree=load('src/lib/family-tree.ts');

// ── pen strokes ──
test('simplification drops collinear points and keeps corners',()=>{
  const line=Array.from({length:50},(_,i)=>({x:i,y:0}));
  assert.deepEqual(drawing.simplifyPoints(line,0.5),[{x:0,y:0},{x:49,y:0}]);
  const corner=[...Array.from({length:20},(_,i)=>({x:i,y:0})),...Array.from({length:20},(_,i)=>({x:19,y:i+1}))];
  const out=drawing.simplifyPoints(corner,0.5);
  assert.equal(out.length,3);assert.deepEqual(out[1],{x:19,y:0});
  assert.equal(drawing.simplifyPoints([{x:1,y:1}],1).length,1);
});
test('simplification copes with a very long scribble',()=>{
  const pts=Array.from({length:20000},(_,i)=>({x:i,y:Math.sin(i/7)*30}));
  const out=drawing.simplifyPoints(pts,1);
  assert.ok(out.length>10&&out.length<pts.length/3);
});
test('smoothed path runs through quadratic midpoints and handles dots and pairs',()=>{
  assert.match(drawing.smoothPath([{x:0,y:0}]),/^M 0 0 l /);
  assert.equal(drawing.smoothPath([{x:0,y:0},{x:10,y:5}]),'M 0 0 L 10 5');
  assert.equal(drawing.smoothPath([{x:0,y:0},{x:10,y:0},{x:10,y:10}]),'M 0 0 Q 10 0 10 5 L 10 10');
  assert.equal(drawing.smoothPath([]),'');
});
test('packing a drawing is relative to its padded box and unpacks back to world space, scaled by resize',()=>{
  const s={id:'s',color:'#000',width:4,points:[{x:100,y:200},{x:150,y:260}]};
  const p=drawing.packDrawing([s]);
  assert.ok(p.x<=98&&p.y<=198&&p.x+p.width>=152&&p.y+p.height>=262);
  assert.equal(p.drawing.w,p.width);assert.equal(p.drawing.strokes[0].points.length,4);
  const back=drawing.unpackDrawing({...p});
  assert.deepEqual(back[0].points,[{x:100,y:200},{x:150,y:260}]);
  const doubled=drawing.unpackDrawing({...p,width:p.width*2,height:p.height*2});
  assert.equal(doubled[0].points[1].x,p.x+(150-p.x)*2);
  assert.equal(drawing.packDrawing([]),null);
});
test('eraser hit test respects stroke width and radius; nearby boxes group',()=>{
  const s={id:'s',color:'#000',width:6,points:[{x:0,y:0},{x:100,y:0}]};
  assert.ok(drawing.hitsStroke(s,{x:50,y:5},4));
  assert.ok(!drawing.hitsStroke(s,{x:50,y:20},4));
  assert.ok(drawing.hitsStroke({...s,points:[{x:5,y:5}]},{x:8,y:5},1));
  assert.ok(drawing.boxesNear({x:0,y:0,w:10,h:10},{x:50,y:0,w:10,h:10},45));
  assert.ok(!drawing.boxesNear({x:0,y:0,w:10,h:10},{x:100,y:0,w:10,h:10},45));
});

// ── smart snapping ──
test('moving box snaps edges and centres within the threshold and draws guides',()=>{
  const other={x:100,y:100,w:200,h:80};
  const r=snap.snapMove({x:104,y:400,w:120,h:60},[other],6);
  assert.equal(r.x,100);assert.equal(r.y,null);
  assert.ok(r.guides.some(g=>g.axis==='x'&&g.pos===100&&g.from===100&&g.to===460));
  assert.ok(r.guides.every(g=>g.axis==='x'));
  const c=snap.snapMove({x:143,y:300,w:120,h:60},[other],6); // centre 203 → 200
  assert.equal(c.x,140);
  const far=snap.snapMove({x:120,y:400,w:120,h:60},[other],6);
  assert.equal(far.x,null);assert.equal(far.guides.length,0);
});
test('closest candidate wins and both axes snap independently',()=>{
  const others=[{x:0,y:0,w:100,h:100},{x:300,y:203,w:50,h:50}];
  const r=snap.snapMove({x:98,y:205,w:100,h:40},others,6);
  assert.equal(r.x,100); // its left edge onto the first box's right edge (2px) …
  assert.equal(r.y,203); // … and its top onto the second box's top (2px)
  assert.ok(r.guides.some(g=>g.axis==='y'&&g.pos===203));
});
test('resize snaps the right and bottom edges only',()=>{
  const r=snap.snapResize({x:0,y:0,w:197,h:52},[{x:300,y:50,w:100,h:100}],6);
  assert.equal(r.w,null);assert.equal(r.h,50);
  const r2=snap.snapResize({x:100,y:0,w:197,h:20},[{x:300,y:500,w:100,h:100}],6);
  assert.equal(r2.w,200);assert.ok(r2.guides.some(g=>g.axis==='x'&&g.pos===300));
});

// ── charts ──
test('radar data is clamped to 3–8 axes and 0–10 values',()=>{
  const c=charts.normalizeChart({kind:'radar',data:[{label:'A',value:14},{label:'B',value:-2}]});
  assert.equal(c.data.length,3);assert.equal(c.data[0].value,10);assert.equal(c.data[1].value,0);
  assert.equal(charts.normalizeChart({kind:'radar',data:Array.from({length:12},(_,i)=>({label:String(i),value:1}))}).data.length,8);
  assert.equal(charts.normalizeChart(undefined).kind,'radar');
  assert.equal(charts.normalizeChart({kind:'pie',data:[{label:'x',value:500}]}).data[0].value,500);
});
test('radar points: first spoke points up, full value reaches the radius',()=>{
  const p=charts.radarPoint(0,5,10,10,100,100,50);
  assert.ok(Math.abs(p.x-100)<1e-9&&Math.abs(p.y-50)<1e-9);
  const half=charts.radarPoint(0,4,5,10,0,0,40);assert.ok(Math.abs(half.y+20)<1e-9);
  assert.equal(charts.radarPolygon([10,10,10],10,0,0,10).split(' ').length,3);
});
test('pie slices cover the circle and skip zeros; full circle arc is two arcs',()=>{
  const s=charts.pieSlices([1,0,3]);
  assert.equal(s.length,2);assert.equal(s[1].index,2);
  assert.ok(Math.abs(s[1].end-Math.PI*2)<1e-9);assert.equal(s[0].fraction,0.25);
  assert.deepEqual(charts.pieSlices([0,0]),[]);
  assert.equal((charts.arcPath(50,50,40,0,Math.PI*2).match(/A /g)||[]).length,2);
  assert.match(charts.arcPath(50,50,40,0,Math.PI*1.5),/ 0 1 1 /);
});
test('chart summary reads as one export line',()=>{
  assert.equal(charts.chartSummary({kind:'radar',data:[{label:'Strength',value:7},{label:'Agility',value:5},{label:'Wit',value:9}]}),'radar chart — Strength 7/10, Agility 5/10, Wit 9/10');
  assert.equal(charts.chartSummary({kind:'pie',data:[{label:'A',value:1},{label:'B',value:3}]}),'pie chart — A 25%, B 75%');
});

// ── shapes ──
test('dividers keep their thickness on resize; frames sit behind everything',()=>{
  const div={type:'shape',shape:{kind:'divider',orientation:'horizontal'},width:400,height:16};
  assert.deepEqual(shapes.clampResize(div,10,300),{w:40,h:16});
  assert.deepEqual(shapes.clampResize({type:'text'},50,10),{w:120,h:40});
  assert.equal(shapes.shapeZIndex({type:'shape',shape:{kind:'frame'},zIndex:9}),-2);
  assert.equal(shapes.shapeZIndex({type:'shape',shape:{kind:'rect'},zIndex:9}),-1);
  assert.equal(shapes.shapeZIndex({type:'shape',shape:{kind:'rect',layer:'front'},zIndex:9}),9);
  assert.deepEqual(shapes.withOrientation({width:400,height:16,shape:{kind:'divider'}},'vertical').height,400);
});

// ── family tree template ──
test('family tree: four aligned generations, no overlaps, every link resolves',()=>{
  let i=0;const {nodes,connections}=tree.buildFamilyTree(p=>`${p}-${i++}`,{x:1000,y:500});
  const people=nodes.filter(n=>n.type==='character'),frames=nodes.filter(n=>n.type==='shape');
  assert.equal(people.length,11);assert.equal(frames.length,4);
  assert.ok(people.every(p=>p.linkedCanvasId&&p.width===tree.TREE.cardW));
  assert.equal(new Set(nodes.map(n=>n.id)).size,nodes.length);
  const ids=new Set(nodes.map(n=>n.id));
  assert.ok(connections.every(c=>ids.has(c.from)&&ids.has(c.to)));
  // every person in a row shares a y; rows are evenly spaced
  const rows=[...new Set(people.map(p=>p.y))].sort((a,b)=>a-b);
  assert.equal(rows.length,4);
  assert.ok(rows.every((y,k)=>k===0||y-rows[k-1]===tree.TREE.row));
  // nothing that isn't a frame overlaps anything else
  const solid=nodes.filter(n=>n.type!=='shape');
  for(const a of solid)for(const b of solid)if(a!==b)assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`${a.text} overlaps ${b.text}`);
  // each frame holds exactly its generation and frames share one width
  assert.equal(new Set(frames.map(f=>f.width)).size,1);
  for(const p of people){const f=frames.find(f=>p.y>=f.y&&p.y+p.height<=f.y+f.height);assert.ok(f&&p.x>=f.x&&p.x+p.width<=f.x+f.width);}
  // children hang centred under their parents' couple sticky
  const hubs=nodes.filter(n=>n.type==='compact-text');assert.equal(hubs.length,4);
  for(const h of hubs){const kids=connections.filter(c=>c.from===h.id).map(c=>nodes.find(n=>n.id===c.to));
    const mid=kids.reduce((a,k)=>a+k.x+k.width/2,0)/kids.length;assert.ok(Math.abs(mid-(h.x+h.width/2))<0.01);}
  assert.equal(Math.min(...nodes.map(n=>n.x)),1000-tree.TREE.framePad);
});
test('templates are fresh each time',()=>{
  let i=0;const mk=p=>`${p}-${i++}`;const a=tree.buildFamilyTree(mk),b=tree.buildFamilyTree(mk);
  assert.ok(a.nodes.every(n=>!b.nodes.some(m=>m.id===n.id)));
  const box=tree.templateBounds(a.nodes);assert.ok(box.w>1000&&box.h>600);
});

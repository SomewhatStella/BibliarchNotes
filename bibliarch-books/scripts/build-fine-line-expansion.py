"""Author custom fine-line vector compositions. No downloaded-art claims."""
from pathlib import Path
import math,json
ROOT=Path(__file__).resolve().parents[1]
def path(d):return '<path d="'+d+'"/>'
def circle(x,y,r):return f'<circle cx="{x}" cy="{y}" r="{r}"/>'
def group(s,x,y,a=0,k=1):return f'<g transform="translate({x} {y}) rotate({a}) scale({k})"'+(f' stroke-width="{0.8/k}"' if k>1 else '')+f'>{s}</g>'
leaf=path('M0 0Q-14 -9 -7 -26Q9 -17 0 0M0 0L-7 -26')
slender=path('M0 0Q-13 -13 -4 -36Q5 -13 0 0')
roundleaf=path('M0 0C-21 -5 -18 -25 -5 -26C10 -27 15 -8 0 0')
ginkgo=path('M0 0L0 -13M0 -13Q-9 -12 -20 -20Q-22 -31 -13 -35L-2 -28 2 -35Q15 -38 21 -25Q12 -15 0 -13M-15 -30L0 -13 13 -30')
oak=path('M0 0C-8 -3 -15 -1 -11 -8C-22 -8 -19 -17 -12 -15C-18 -26 -7 -30 -5 -23C-8 -37 4 -39 4 -25C12 -32 19 -23 10 -19C22 -19 20 -9 10 -10C17 -2 5 -2 0 0M0 0L0 -29')
flower=''.join(group(path('M0 0C-12 -7 -10 -21 0 -17C10 -21 12 -7 0 0'),0,0,i*72) for i in range(5))+circle(0,0,2)
daisy=''.join(group(path('M0 -3Q-6 -16 0 -20Q6 -16 0 -3'),0,0,i*45) for i in range(8))+circle(0,0,3)
bell=path('M-7 -3Q-8 10 -13 13Q0 19 13 13Q8 10 7 -3Q0 -9 -7 -3M-3 16L-3 20M3 16L3 20')
rose=path('M-9 -3C-16 -14 -2 -20 4 -14C18 -16 22 -4 14 4C12 16 -3 18 -10 9C-18 7 -17 -3 -9 -3M-8 -4Q-1 -12 7 -6Q14 2 6 7Q-5 13 -8 2Q-7 -6 1 -4Q8 -2 3 3')
fern=path('M0 0Q-4 -25 0 -48'+''.join(f'M{0} {-i}Q{-15+i/5} {-i-7} -2 {-i-12}M0 {-i}Q{15-i/5} {-i-5} 2 {-i-11}' for i in [6,15,24,33]))
star=path('M0 -9L2 -2 9 0 2 2 0 9 -2 2 -9 0 -2 -2Z')
moon=path('M4 -14C-16 -14 -18 12 0 15Q13 17 17 7C0 16 -9 -3 4 -14Z')
B=[];D=[]
def add(dst,name,cat,art,w=220,h=100):
 prefix='botx' if dst is B else 'decx'
 slug=name.lower().replace(' ','-')
 dst.append(dict(id=f'bibliarch-{prefix}-{slug}',name=name,category=cat,source='Custom AI-assisted Bibliarch vector composition (not sourced)',license='CC0-1.0',svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" fill="none" stroke="#555" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round">{art}</svg>'))
stem=path('M16 83Q90 67 193 25')
add(B,'Eucalyptus spray','Botanical',stem+''.join(group(roundleaf,x,y,a,.65) for x,y,a in [(50,75,-35),(79,64,140),(108,54,-15),(138,43,140),(169,32,0)]))
add(B,'Ginkgo fan branch','Botanical',path('M20 84Q73 55 181 38')+group(ginkgo,66,65,-25,.85)+group(ginkgo,116,48,20,.9)+group(ginkgo,162,40,60,.7))
add(B,'Willow catkins','Botanical',path('M20 83Q90 64 180 18')+''.join(group(path('M0 0Q-10 -9 -5 -17Q5 -15 0 0M-3 -3L-6 -8M-2 -7L-5 -12'),x,y,a) for x,y,a in [(54,70,-40),(77,60,145),(98,51,-20),(119,43,140),(142,33,-10),(162,24,140)]))
add(B,'Oak twig','Botanical',stem+group(oak,61,71,-35,.8)+group(oak,111,52,150,.8)+group(oak,160,34,15,.8)+group(path('M0 0Q-8 8 0 17Q8 8 0 0M-6 1Q0 -7 6 1Z'),193,25,20,.7))
add(B,'Acacia blossom','Botanical',stem+group(fern,68,69,-55,.75)+group(fern,135,43,135,.65)+''.join(group(daisy,x,y,0,.32) for x,y in [(99,37),(119,28),(143,18),(165,25)]))
add(B,'Unfurling fern','Botanical',group(fern,93,89,28,1.5)+path('M93 89Q129 49 155 49C181 48 176 18 159 20C143 22 148 39 158 34'))
add(B,'Lily of the valley','Botanical',path('M72 88Q72 25 114 16Q145 12 153 26M93 31Q119 25 128 39M80 49Q103 44 111 56')+group(bell,151,31,0,.75)+group(bell,128,44,0,.7)+group(bell,111,61,0,.65)+group(slender,72,88,-34,1.7))
add(B,'Cherry blossom branch','Botanical',path('M20 77Q88 59 192 38M80 61L96 33M133 49L147 72')+group(flower,99,28,10,.7)+group(flower,150,75,20,.62)+group(flower,182,38,0,.75)+group(leaf,63,67,-40,.8))
add(B,'Cosmos pair','Botanical',path('M90 89Q96 53 84 29M95 69Q126 62 137 40')+group(daisy,83,28,0,.85)+group(daisy,142,30,18,.65)+group(fern,94,77,65,.6))
add(B,'Thistle branch','Botanical',path('M103 89Q110 49 101 29M107 64Q132 58 143 42')+group(path('M-10 0Q0 16 10 0L8 -12 4 -4 0 -16 -4 -4 -8 -12Z M-8 4L-13 8M8 4L13 8'),101,30)+group(leaf,106,75,-50,1.1)+group(path('M-8 0Q0 10 8 0L6 -9 2 -3 0 -12 -3 -4 -6 -9Z'),146,39))
add(B,'Rosemary stem','Botanical',path('M22 80Q105 56 188 22')+''.join(group(slender,x,y,a,.42) for x,y,a in [(45,72,-45),(65,65,150),(85,58,-35),(105,50,150),(125,42,-35),(146,34,150),(169,25,-20)]))
add(B,'Bellflower cascade','Botanical',path('M25 28Q93 15 146 45Q170 57 183 80')+group(bell,62,37,-20,.7)+group(bell,101,34,0,.9)+group(bell,147,55,20,.7)+group(leaf,37,26,-70,.7)+group(leaf,127,33,70,.7))
# Eight corners, different flora and edge shapes.
corner=path('M16 110Q20 40 33 29Q49 17 111 16')
for name,motif,placements,extra in [
 ('Rosebud corner',rose,[(32,30,0,.65),(21,73,0,.4),(77,18,0,.42)],group(leaf,31,45,-20,.6)),
 ('Ginkgo corner',ginkgo,[(25,74,-65,.65),(66,20,45,.65),(29,31,-40,.6)],''),
 ('Daisy corner',daisy,[(29,30,0,.6),(20,66,0,.4),(68,18,0,.42)],group(leaf,89,16,50,.55)),
 ('Fern bracket',fern,[(18,108,10,1.2),(40,23,80,1.15)],''),
 ('Eucalyptus corner',roundleaf,[(19,92,-55,.5),(23,67,60,.5),(30,41,-50,.5),(53,22,40,.5),(81,17,140,.5)],''),
 ('Orchid corner',flower,[(32,31,15,.85),(19,88,0,.45)],group(slender,57,20,60,1.25)),
 ('Oakleaf corner',oak,[(23,76,-55,.65),(32,35,0,.7),(79,18,60,.65)],''),
 ('Lavender corner',slender,[(20,91,-50,.45),(22,73,65,.45),(28,47,-45,.45),(48,24,45,.45),(72,18,135,.45),(99,16,50,.45)],circle(31,31,3)+circle(36,26,2))]:
 add(B,name,'Corners',corner+''.join(group(motif,*p) for p in placements)+extra,130,130)
# Six distinct wreath and frame arrangements.
add(B,'Open laurel wreath','Frames',path('M92 87C20 81 18 30 55 15M128 87C200 81 202 30 165 15')+''.join(group(leaf,x,y,a,.55) for x,y,a in [(53,79,-70),(36,59,-40),(39,37,20),(167,79,70),(184,59,40),(181,37,-20)]))
add(B,'Rose oval wreath','Frames','<ellipse cx="110" cy="50" rx="69" ry="34"/>'+group(rose,45,53,0,.7)+group(rose,175,53,20,.7)+group(leaf,65,78,-70,.55)+group(leaf,153,22,70,.55))
add(B,'Meadow half wreath','Frames',path('M39 28C13 84 202 109 185 28')+group(daisy,67,73,0,.55)+group(flower,113,83,20,.5)+group(bell,154,63,-40,.55)+group(slender,39,43,-30,.7)+group(leaf,177,58,55,.75))
add(B,'Ivy arch frame','Frames',path('M34 88V42C34 5 186 5 186 42V88')+group(leaf,36,47,-50,.6)+group(leaf,66,20,0,.6)+group(leaf,153,20,100,.6)+group(leaf,185,61,45,.6))
add(B,'Botanical diamond frame','Frames',path('M110 9L191 50 110 91 29 50Z')+group(roundleaf,51,64,-30,.55)+group(slender,75,75,-20,.8)+group(roundleaf,167,34,140,.55)+group(slender,144,23,150,.8))
add(B,'Wildflower oval opening','Frames',path('M79 17C17 22 18 84 83 85M141 17C203 22 202 84 137 85')+group(flower,79,17,0,.5)+group(daisy,140,85,0,.5)+group(leaf,44,67,-50,.65)+group(slender,175,34,130,.75))
add(B,'Jasmine chain','Book ornaments',path('M10 49Q57 28 104 49T210 49')+''.join(group(flower,x,y,0,.38) for x,y in [(31,42),(78,40),(135,58),(184,58)])+group(leaf,104,49,70,.6))
add(B,'Fern and pearl divider','Book ornaments',path('M12 58Q59 49 92 49M128 49Q161 49 208 58')+group(fern,85,50,-65,.65)+group(fern,135,50,65,.65)+circle(110,49,4))
add(B,'Rosebud thread','Book ornaments',path('M12 52H77M143 52H208')+group(rose,110,48,0,.85)+group(leaf,88,53,-65,.55)+group(leaf,132,53,65,.55))
add(B,'Hanging wisteria','Book ornaments',path('M12 25Q110 55 208 25')+''.join(group(path('M0 0V25M0 8Q-10 0 -8 10Q-2 17 0 8M0 15Q10 8 8 18Q2 24 0 15M0 24Q-7 27 0 35Q7 27 0 24'),x,y,0,k) for x,y,k in [(43,33,.8),(82,39,1.1),(130,39,1.2),(174,33,.75)]))
add(B,'Paired wheat stems','Book ornaments',path('M15 73Q63 60 102 28M205 73Q157 60 118 28')+''.join(group(slender,x,y,a,.38) for x,y,a in [(45,62,-25),(61,53,110),(79,42,-10),(94,32,110),(175,62,25),(159,53,-110),(141,42,10),(126,32,-110)]))
# Decorative celestial collection: nine distinct structural compositions.
add(D,'Moon phase thread','Celestial',path('M12 50H35M185 50H208')+circle(110,50,13)+group(moon,66,50,0,.8)+group(moon,154,50,180,.8)+circle(43,50,2)+circle(177,50,2))
add(D,'Constellation canopy','Celestial',path('M20 59L54 29 95 49 134 20 193 43M95 49L145 80')+''.join(group(star,x,y,0,k) for x,y,k in [(20,59,.5),(54,29,.65),(95,49,.85),(134,20,.5),(193,43,.65),(145,80,.4)]))
add(D,'Comet trail','Celestial',path('M14 74Q70 73 151 37M20 65Q69 66 141 34M43 80Q98 73 155 45')+group(star,174,30,18,1.7)+circle(117,51,1.5)+circle(83,59,1))
add(D,'Sunrise fan divider','Celestial',path('M12 67H208M87 67A23 23 0 0 1 133 67M110 15V34M73 29L85 44M147 29L135 44M55 51L78 57M165 51L142 57'))
add(D,'Twin crescent chain','Celestial',path('M14 26Q110 75 206 26M51 41V55M169 41V55')+group(moon,51,68,-25,.65)+group(moon,169,68,25,.65)+group(star,110,60,0,.85)+circle(83,49,2)+circle(137,49,2))
add(D,'Orbit cartouche','Celestial','<ellipse cx="110" cy="50" rx="71" ry="26"/>'+path('M36 72Q93 7 184 28M36 72Q122 97 184 28')+group(star,45,33,0,.7)+group(star,176,67,0,.65)+circle(145,25,3))
add(D,'Starlight waterfall','Celestial',path('M19 22Q110 51 201 22M53 31V65M89 37V77M129 37V61M169 31V74')+''.join(group(star,x,y,0,k) for x,y,k in [(53,69,.6),(89,82,.5),(129,67,.6),(169,80,.6)]))
add(D,'Crescent halo','Celestial',group(moon,107,48,-15,1.7)+path('M69 20Q42 54 72 81M151 18Q180 54 151 82')+group(star,68,15,0,.55)+group(star,153,85,0,.5)+circle(47,46,2)+circle(178,53,2))
add(D,'Astral compass','Celestial',group(star,110,50,0,2.3)+circle(110,50,15)+path('M12 50H74M146 50H208M110 15V5M110 85V95M83 23L92 32M137 23L128 32M83 77L92 68M137 77L128 68'))
# Ten independent hand-drawn flourish constructions.
flourishes=[
('Swan scroll','M12 62C40 78 65 15 91 36C112 52 77 75 77 49C78 17 145 18 166 45C185 71 210 47 201 34M42 55C20 37 47 22 52 37M156 39C164 20 187 19 185 32'),
('Double infinity ribbon','M12 48C38 13 64 85 91 49C116 14 142 86 170 50C190 26 204 37 208 43M12 56C38 21 64 93 91 57C116 22 142 94 170 58C190 34 204 45 208 51'),
('Fountain flourish','M110 86V36C110 12 74 6 73 28C72 45 96 42 91 30M110 36C110 12 146 6 147 28C148 45 124 42 129 30M110 63C76 24 24 38 34 60C42 76 59 57 48 53M110 63C144 24 196 38 186 60C178 76 161 57 172 53'),
('Low looping divider','M12 53H57C81 53 72 31 62 38C50 48 80 70 110 53C140 36 170 58 158 68C148 75 139 53 163 53H208'),
('Heartline flourish','M12 51Q58 18 94 50C60 19 114 12 110 45C106 12 160 19 126 50Q162 82 208 51M94 50Q110 65 126 50M22 65Q56 72 74 54M146 46Q179 25 198 35'),
('Fine lyre','M39 21C22 80 94 88 110 49C126 10 198 18 181 77M39 21C61 8 75 32 59 37M181 77C159 90 145 66 161 61M12 49H61M159 49H208'),
('Tapered arabesque','M12 64C51 66 48 24 76 35C91 41 85 58 74 51M208 64C169 66 172 24 144 35C129 41 135 58 146 51M76 35Q110 12 144 35M74 51Q110 82 146 51'),
('Overlapping silk loops','M13 55C29 23 64 24 72 48C79 70 46 72 50 50C56 18 126 17 148 50C164 74 191 69 207 42M32 65Q87 80 111 40C132 12 170 21 170 42C170 60 146 60 149 43'),
('Quiet bracket pair','M13 49H59C88 49 80 20 66 28C50 39 86 72 103 50M207 49H161C132 49 140 20 154 28C170 39 134 72 117 50M103 50Q110 36 117 50Q110 64 103 50'),
('Crown of loops','M14 68Q50 75 64 47C73 29 49 29 53 45C58 60 88 45 94 23C98 9 118 9 122 23C128 45 158 60 163 45C167 29 143 29 152 47Q166 75 202 68M42 79Q110 66 174 79')]
for n,p in flourishes:add(D,n,'Book ornaments',path(p))
# Six geometric/art-deco frames and corners, fine lines, not icons.
add(D,'Stepped deco corners','Corners',path('M15 90V15H107M22 90V22H107M29 66V29H80M15 44L44 15M22 58L58 22'),120,110)
add(D,'Fan corner','Corners',path('M16 102V16H102M16 72A56 56 0 0 0 72 16M16 48A32 32 0 0 0 48 16M16 16L66 66M16 16L44 84M16 16L84 44'),120,120)
add(D,'Open octagon frame','Frames',path('M63 12H157L197 34V66L157 88H63L23 66V34ZM71 18H149M71 82H149M29 39V61M191 39V61')+circle(110,12,2)+circle(110,88,2))
add(D,'Fine cathedral arch','Frames',path('M49 88V43Q53 24 110 9Q167 24 171 43V88M55 88V44Q60 29 110 16Q160 29 165 44V88M49 81H76M144 81H171'))
add(D,'Interlaced diamond border','Frames',path('M110 9L200 50 110 91 20 50ZM110 17L183 50 110 83 37 50ZM72 26L148 74M148 26L72 74'))
add(D,'Pearl corner bracket','Corners',path('M15 104V29Q15 15 29 15H104M23 103V34Q23 23 34 23H103')+circle(15,15,4)+circle(15,49,2)+circle(49,15,2),120,120)
# Six seasonal/ribbon/pearl compositions.
add(D,'Snowdrop ribbon','Winter',path('M12 54Q52 26 89 52M131 52Q168 26 208 54M110 19V81M90 31L130 69M90 69L130 31M103 23L110 31 117 23M103 77L110 69 117 77M93 39L103 43 101 33M127 61L117 57 119 67'))
add(D,'Frost crystal chain','Winter',path('M12 50H208')+''.join(group(path('M0 -14V14M-12 -7L12 7M-12 7L12 -7M-4 -10L0 -6 4 -10M-4 10L0 6 4 10'),x,50,0,k) for x,k in [(45,.6),(110,1.5),(175,.6)]))
add(D,'Winter crescent swags','Winter',path('M12 24Q110 68 208 24M43 36V65M177 36V65')+group(moon,110,40,0,1)+group(star,43,71,0,.6)+group(star,177,71,0,.6)+path('M79 48V72M74 65L84 75M84 65L74 75M141 48V72M136 65L146 75M146 65L136 75'))
add(D,'Silk bow divider','Book ornaments',path('M12 50H77M143 50H208M105 45C79 15 63 39 92 51L105 45ZM115 45C141 15 157 39 128 51L115 45ZM105 45Q110 40 115 45L115 54Q110 59 105 54ZM106 55L83 85 91 82 94 89 110 57M114 55L134 85 127 82 123 89 110 57'))
add(D,'Pearl double festoon','Book ornaments',path('M12 25Q61 84 110 25Q159 84 208 25M12 25Q61 67 110 25Q159 67 208 25')+''.join(circle(x,y,2) for x,y in [(29,44),(47,52),(69,52),(89,43),(130,44),(151,52),(172,52),(191,43)])+group(star,110,25,0,.65))
add(D,'Lace scallop divider','Book ornaments',path('M12 42H208M12 42Q28 76 44 42Q60 76 76 42Q92 76 108 42Q124 76 140 42Q156 76 172 42Q188 76 208 42')+''.join(circle(x,68,1.5) for x in [28,60,92,124,156,190]))
for filename,export,items in [('botanical','BOTANICAL_EXPANSION',B),('decorative','DECORATIVE_EXPANSION',D)]:
 assert len(items)==31,(filename,len(items))
 (ROOT/f'src/fine-line-{filename}-expansion.ts').write_text('// Custom AI-assisted vector compositions, not downloaded or traced. CC0-1.0.\nexport const '+export+' = '+json.dumps(items,ensure_ascii=True,indent=2)+';\n',encoding='utf8')
 folder=ROOT/f'public/decals/fine-line-{filename}';folder.mkdir(parents=True,exist_ok=True)
 (folder/'CREDITS.txt').write_text('31 custom AI-assisted Bibliarch vector compositions. Not downloaded or traced. CC0-1.0 dedication; no warranty.\nhttps://creativecommons.org/publicdomain/zero/1.0/\n',encoding='utf8')
print('Created',len(B)+len(D),'distinct compositions')

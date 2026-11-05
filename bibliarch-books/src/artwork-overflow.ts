// Page-sized layers keep the full artwork opaque on paper and only its bleed faint.
// The even-odd hole excludes the page itself (including for rotated ornaments).
export const artworkOverflowCss = `
.artwork-clip,.artwork-overflow-ghost{position:absolute;inset:0;pointer-events:none}
.artwork-clip{overflow:hidden}
.artwork-overflow-ghost{opacity:.25;clip-path:polygon(evenodd,-1000% -1000%,1100% -1000%,1100% 1100%,-1000% 1100%,-1000% -1000%,0 0,100% 0,100% 100%,0 100%,0 0)}
.paper:has(.decal-overflow-ghost),.pagination-page:has(.decal-overflow-ghost){overflow:visible!important}
[data-decal-proxy]{pointer-events:auto;cursor:move;touch-action:none;user-select:none}
@media print{.artwork-overflow-ghost,.decal-selection{display:none!important}.pagination-page:has(.decal-overflow-ghost){overflow:hidden!important}}
`;

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Sidebar from '../src/components/Sidebar';
import CustomTypesDialog from '../src/components/CustomTypesDialog';
import type { CanvasRow } from '../src/lib/types';
const canvas = { nodes: [{ id: 'fixture-card', type: 'text', text: 'Fixture only', x: 0, y: 0 }], connections: [] } as unknown as CanvasRow;
function Fixture() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  return <div style={{ height: 400, display: 'flex' }}>
    <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} onManageTypes={() => setOpen(true)} onAddNode={() => {}} connectMode={false} onToggleConnectMode={() => {}} onBackToDashboard={() => {}} />
    {open && <CustomTypesDialog canvas={canvas} canvases={{}} onClose={() => setOpen(false)} onCreate={t => { document.body.dataset.created = t.id; setOpen(false); }} />}
  </div>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);

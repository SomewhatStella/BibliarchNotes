import React from 'react';
import {createRoot} from 'react-dom/client';
import Dashboard from '../src/components/Dashboard';
createRoot(document.getElementById('root')!).render(<Dashboard userId="fixture" username="Stella"/>);

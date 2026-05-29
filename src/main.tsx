import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeGlobalAttachmentIntercepts } from './lib/indexedDbHelper';

initializeGlobalAttachmentIntercepts();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

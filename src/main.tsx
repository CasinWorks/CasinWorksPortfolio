import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Analytics } from "@vercel/analytics/react";
import App from './App.tsx';
import './index.css';

const SITE_TITLE = 'C.J. Casin — Independent Engineering';
document.title = SITE_TITLE;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react";
import App from './App.tsx';
import {MaintenanceNotice} from './components/MaintenanceNotice.tsx';
import {ScrollToTop} from './components/ScrollToTop.tsx';
import CaseStudyPage from './pages/CaseStudyPage.tsx';
import AppsForEveryonePage from './pages/AppsForEveryonePage.tsx';
import './index.css';

const SITE_TITLE = 'C.J. Casin — Independent Engineering';
document.title = SITE_TITLE;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MaintenanceNotice />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/AppsForEveryone" element={<AppsForEveryonePage />} />
        <Route path="/case-studies/:slug" element={<CaseStudyPage />} />
      </Routes>
    </BrowserRouter>
    <Analytics />
  </StrictMode>,
);

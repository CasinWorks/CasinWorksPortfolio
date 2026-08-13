import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react";
import App from './App.tsx';
import {MaintenanceNotice} from './components/MaintenanceNotice.tsx';
import {ScrollToTop} from './components/ScrollToTop.tsx';
import {SiteSchema} from './components/SiteSchema.tsx';
import CaseStudyPage from './pages/CaseStudyPage.tsx';
import AppsForEveryonePage from './pages/AppsForEveryonePage.tsx';
import NotFoundPage from './pages/NotFoundPage.tsx';
import ThankYouPage from './pages/ThankYouPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MaintenanceNotice />
      <ScrollToTop />
      <SiteSchema />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/AppsForEveryone" element={<AppsForEveryonePage />} />
        <Route path="/case-studies/:slug" element={<CaseStudyPage />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
    <Analytics />
  </StrictMode>,
);

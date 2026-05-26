import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import App from './App.tsx';
import {ScrollToTop} from './components/ScrollToTop.tsx';
import CaseStudyPage from './pages/CaseStudyPage.tsx';
import './index.css';

const SITE_TITLE = 'C.J. Casin — Independent Engineering';
document.title = SITE_TITLE;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/case-studies/:slug" element={<CaseStudyPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);

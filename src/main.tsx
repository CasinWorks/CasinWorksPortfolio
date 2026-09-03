import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react";
import App from './App.tsx';
import {MaintenanceNotice} from './components/MaintenanceNotice.tsx';
import {ScrollToTop} from './components/ScrollToTop.tsx';
import {SiteSchema} from './components/SiteSchema.tsx';
import CaseStudyPage from './pages/CaseStudyPage.tsx';
import AppsForEveryonePage from './pages/AppsForEveryonePage.tsx';
import NotFoundPage from './pages/NotFoundPage.tsx';
import ThankYouPage from './pages/ThankYouPage.tsx';
import { PortalAuthLayout } from './portal/PortalRoutes.tsx';
import { HomeRedirect, PortalShell, RequireAdmin, RequireAuth, RequireClientArea, RequireGigArea } from './portal/PortalShell.tsx';
import { AdminScreen } from './portal/screens/AdminScreen.tsx';
import { ClientDetailScreen } from './portal/screens/ClientDetailScreen.tsx';
import { ClientsScreen } from './portal/screens/ClientsScreen.tsx';
import { PortalRegisterScreen, PortalSignInScreen } from './portal/screens/AuthScreens.tsx';
import { ClientDashboard } from './portal/screens/ClientDashboard.tsx';
import { DocumentsScreen } from './portal/screens/DocumentsScreen.tsx';
import { GigBoardScreen } from './portal/screens/GigBoardScreen.tsx';
import { ProjectProgressScreen } from './portal/screens/ProjectProgressScreen.tsx';
import { SharedProjectScreen } from './portal/screens/SharedProjectScreen.tsx';
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
        <Route path="/case-studies/vela-brand-system" element={<Navigate to="/case-studies/vela-private" replace />} />
        <Route path="/case-studies/:slug" element={<CaseStudyPage />} />
        <Route path="/thank-you" element={<ThankYouPage />} />
        <Route path="/portal" element={<PortalAuthLayout />}>
          <Route path="sign-in" element={<PortalSignInScreen />} />
          <Route path="register" element={<PortalRegisterScreen />} />
          <Route path="view/:token" element={<SharedProjectScreen />} />
          <Route element={<RequireAuth />}>
            <Route element={<PortalShell />}>
              <Route index element={<HomeRedirect />} />
              <Route element={<RequireClientArea />}>
                <Route path="dashboard" element={<ClientDashboard />} />
                <Route path="projects/:projectId" element={<ProjectProgressScreen />} />
                <Route path="projects/:projectId/documents" element={<DocumentsScreen />} />
                <Route path="projects/:projectId/documents/:documentId" element={<DocumentsScreen />} />
              </Route>
              <Route element={<RequireGigArea />}>
                <Route path="gigs" element={<GigBoardScreen />} />
              </Route>
              <Route element={<RequireAdmin />}>
                <Route path="admin" element={<AdminScreen />} />
                <Route path="admin/clients" element={<ClientsScreen />} />
                <Route path="admin/clients/:clientId" element={<ClientDetailScreen />} />
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
    <Analytics />
  </StrictMode>,
);

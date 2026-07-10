import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ViewerLayout } from '@/layouts/ViewerLayout';
import { ViewerPage } from '@/pages/viewer/ViewerPage';
import { ROUTES } from '@/routes/paths';
import '@/styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<ViewerLayout />}>
          <Route path={ROUTES.VIEWER} element={<ViewerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);

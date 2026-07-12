import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ViewerLayout } from '@/layouts/ViewerLayout';
import { ViewerPage } from '@/pages/viewer/ViewerPage';
import { ROUTES } from '@/routes/paths';
import { startViewerWarmup } from '@/features/ar/utils/viewer-warmup';
import '@/styles/globals.css';

// Kick off manifest + video prefetch before React mounts (saves 200–800ms)
const earlySlug = location.pathname.match(/^\/viewer\/([^/?#]+)/)?.[1];
if (earlySlug) {
  void startViewerWarmup(decodeURIComponent(earlySlug));
}

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

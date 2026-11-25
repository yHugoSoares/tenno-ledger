import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppStateProvider } from '@/state/AppStateProvider';
import { ToastProvider } from '@/state/ToastProvider';
import { Layout } from '@/components/Layout';

const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((module) => ({ default: module.LandingPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })),
);
const AboutPage = lazy(() =>
  import('@/pages/AboutPage').then((module) => ({ default: module.AboutPage })),
);
const InventoryPage = lazy(() =>
  import('@/pages/InventoryPage').then((module) => ({ default: module.InventoryPage })),
);
const CraftingPage = lazy(() =>
  import('@/pages/CraftingPage').then((module) => ({ default: module.CraftingPage })),
);
const RelicsPage = lazy(() =>
  import('@/pages/RelicsPage').then((module) => ({ default: module.RelicsPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);

function PageFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <span className="text-sm text-muted">Loading…</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<LandingPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="crafting" element={<CraftingPage />} />
                <Route path="relics" element={<RelicsPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AppStateProvider>
  );
}

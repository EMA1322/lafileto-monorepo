import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BaseLayout } from '../layouts/BaseLayout.jsx';
import { ShellHomePage } from '../pages/ShellHomePage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/r" element={<BaseLayout />}>
          <Route index element={<ShellHomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/r" replace />} />
      </Routes>
    </HashRouter>
  );
}

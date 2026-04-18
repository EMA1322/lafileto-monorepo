import { Outlet } from 'react-router-dom';
import { AppShell, PageContainer } from '/src/components/layout/AppShell.jsx';

export function BaseLayout() {
  return (
    <AppShell aria-label="React public home" className="react-shell">
      <PageContainer as="div">
        <Outlet />
      </PageContainer>
    </AppShell>
  );
}

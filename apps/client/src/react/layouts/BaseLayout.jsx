import { Outlet } from 'react-router-dom';

export function BaseLayout() {
  return (
    <section aria-label="React public home" className="react-shell">
      <Outlet />
    </section>
  );
}

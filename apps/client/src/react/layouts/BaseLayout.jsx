import { Outlet } from 'react-router-dom';

export function BaseLayout() {
  return (
    <section aria-label="React shell" className="react-shell">
      <header>
        <h1>La Fileto React Shell</h1>
      </header>
      <Outlet />
    </section>
  );
}

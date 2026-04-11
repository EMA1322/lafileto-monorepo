import { ShellStatusCard } from '../components/ShellStatusCard.jsx';
import { useShellStatus } from '../hooks/useShellStatus.jsx';

export function ShellHomePage() {
  const { loading, error, data } = useShellStatus();

  return (
    <main>
      <p>This is the React bootstrap shell for Phase 2 migration.</p>
      <ShellStatusCard loading={loading} error={error} data={data} />
      <p>
        Legacy app remains active at <a href="#home">#home</a>.
      </p>
    </main>
  );
}

export function ShellStatusCard({ loading, error, data }) {
  if (loading) {
    return <p role="status">Loading shell status…</p>;
  }

  if (error) {
    return (
      <p role="alert">
        We could not load business status from <code>/api/v1/public/business-status</code>.
      </p>
    );
  }

  return (
    <p role="status">
      Business status from public API: <strong>{data?.isOpen ? 'Open' : 'Closed'}</strong>
    </p>
  );
}

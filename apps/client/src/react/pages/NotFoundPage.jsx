import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main>
      <h2>Route not found</h2>
      <p>
        Go back to <Link to="/">React shell home</Link> or <a href="#home">legacy home</a>.
      </p>
    </main>
  );
}

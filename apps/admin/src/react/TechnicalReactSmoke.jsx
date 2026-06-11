export default function TechnicalReactSmoke({ label = 'React bridge ready' }) {
  return (
    <section data-admin-react-smoke="true" aria-label="Technical React bridge smoke">
      {label}
    </section>
  );
}

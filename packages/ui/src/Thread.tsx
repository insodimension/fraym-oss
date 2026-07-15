export interface ThreadProps {
  title?: string;
}

export function Thread({ title = "Fraym thread" }: ThreadProps) {
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      <p>Your agent session will appear here.</p>
    </section>
  );
}


export function ErrorMessage({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="error" role="alert">
      {children}
    </p>
  );
}

export function LoadingMessage({ children = 'Loading…' }: { children?: React.ReactNode }) {
  return (
    <p className="muted" role="status">
      {children}
    </p>
  );
}

export function EmptyMessage({ children }: { children: React.ReactNode }) {
  return <div className="panel muted">{children}</div>;
}

export function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1>{title}</h1>
      <p className="muted" style={{ margin: '6px 0 0' }}>
        {description}
      </p>
    </div>
  );
}

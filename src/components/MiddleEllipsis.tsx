interface MiddleEllipsisProps {
  text: string;
  className?: string;
}

export function MiddleEllipsis({ text, className = "" }: MiddleEllipsisProps) {
  // Split roughly in half, biasing toward keeping more of the end
  const mid = Math.ceil(text.length / 2);
  const start = text.slice(0, mid);
  const end = text.slice(mid);

  return (
    <span className={`middle-ellipsis ${className}`}>
      <span className="middle-ellipsis-start">{start}</span>
      <span className="middle-ellipsis-end">{end}</span>
    </span>
  );
}

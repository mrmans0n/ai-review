interface MiddleEllipsisProps {
  text: string;
  className?: string;
  dragRegion?: boolean;
}

export function MiddleEllipsis({ text, className = "", dragRegion = false }: MiddleEllipsisProps) {
  // Split roughly in half, biasing toward keeping more of the end
  const mid = Math.ceil(text.length / 2);
  const start = text.slice(0, mid);
  const end = text.slice(mid);

  const dragRegionProps = dragRegion ? { "data-tauri-drag-region": true } : {};

  return (
    <span className={`middle-ellipsis ${className}`} {...dragRegionProps}>
      <span className="middle-ellipsis-start" {...dragRegionProps}>{start}</span>
      <span className="middle-ellipsis-end" {...dragRegionProps}>{end}</span>
    </span>
  );
}

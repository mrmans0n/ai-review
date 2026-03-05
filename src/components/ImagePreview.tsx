interface ImagePreviewProps {
  fileName: string;
  status: string;
  oldImageSrc: string | null;
  newImageSrc: string | null;
  loading: boolean;
  error: string | null;
}

function ImagePane({
  title,
  src,
  deleted = false,
}: {
  title: string;
  src: string;
  deleted?: boolean;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-ctp-subtext">{title}</span>
        {deleted && <span className="text-xs font-medium text-ctp-red">Removed</span>}
      </div>
      <div className={`relative rounded border overflow-hidden bg-ctp-base ${deleted ? "border-ctp-red/60" : "border-ctp-surface1"}`}>
        <img src={src} alt={title} className={`w-full h-auto max-h-[70vh] object-contain ${deleted ? "opacity-60 grayscale" : ""}`} />
        {deleted && <div className="absolute inset-0 bg-ctp-red/10 pointer-events-none" />}
      </div>
    </div>
  );
}

export function ImagePreview({
  fileName,
  status,
  oldImageSrc,
  newImageSrc,
  loading,
  error,
}: ImagePreviewProps) {
  if (loading) {
    return (
      <div className="bg-ctp-mantle rounded border border-ctp-surface1 p-10 text-center text-ctp-subtext">
        Loading image preview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-ctp-mantle rounded border border-ctp-red/40 p-6">
        <div className="text-ctp-red text-sm font-medium mb-2">Failed to load image preview</div>
        <div className="text-ctp-subtext text-sm">{error}</div>
      </div>
    );
  }

  if (status === "added" && newImageSrc) {
    return <ImagePane title={fileName} src={newImageSrc} />;
  }

  if (status === "deleted" && oldImageSrc) {
    return <ImagePane title={fileName} src={oldImageSrc} deleted />;
  }

  if (oldImageSrc && newImageSrc) {
    return (
      <div className="bg-ctp-mantle rounded border border-ctp-surface1 p-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ImagePane title="Old" src={oldImageSrc} />
          <ImagePane title="New" src={newImageSrc} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ctp-mantle rounded border border-ctp-surface1 p-8 text-center text-ctp-subtext">
      No image preview available
    </div>
  );
}

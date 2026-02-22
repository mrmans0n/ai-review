interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-ctp-base/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-ctp-mantle border border-ctp-surface1 rounded-md shadow-2xl max-w-md w-full mx-4">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-ctp-surface1">
          <div className={`w-0.5 h-5 rounded-full flex-shrink-0 ${destructive ? "bg-ctp-red" : "bg-ctp-peach"}`} />
          <h2 className="text-base font-semibold text-ctp-text">{title}</h2>
        </div>
        <div className="px-6 py-4">
          <p className="text-ctp-subtext">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-ctp-surface1 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="text-ctp-subtext hover:text-ctp-text bg-ctp-surface0 rounded-sm px-4 py-2 text-sm border border-ctp-surface1 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-sm text-sm font-medium hover:opacity-90 transition-opacity ${
              destructive
                ? "bg-ctp-red text-ctp-base"
                : "bg-ctp-mauve text-ctp-base"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

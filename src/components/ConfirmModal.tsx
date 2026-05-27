import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmModal({
  isOpen,
  title = "Confirmation de suppression",
  message,
  onConfirm,
  onCancel,
  confirmLabel = "OUI",
  cancelLabel = "NON",
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4 p-6">
          <div className="p-2.5 bg-destructive/10 text-destructive rounded-full shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-semibold text-foreground">{title}</h3>
            <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="px-5 py-2 text-xs font-semibold rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors uppercase tracking-wider min-w-[70px] text-center"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConfirm();
            }}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors uppercase tracking-wider min-w-[70px] text-center"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

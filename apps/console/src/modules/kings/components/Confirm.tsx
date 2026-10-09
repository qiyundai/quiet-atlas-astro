import { useEffect, useRef, useState } from "react";
interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}
export function Confirm({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setError(undefined);
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [open]);
  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await onConfirm();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The action failed. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="confirm-title"
      className="confirm-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <p className="eyebrow">Confirm action</p>
      <h2 id="confirm-title">{title}</h2>
      <p>{message}</p>
      {error && (
        <div role="alert" className="inline-error">
          {error}
        </div>
      )}
      <div className="flex gap-3 justify-end mt-6">
        <button
          autoFocus
          className="admin-btn"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          disabled={busy}
          className={`admin-btn admin-btn-${variant}`}
          onClick={submit}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

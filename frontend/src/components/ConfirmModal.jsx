import Modal from './Modal';
import Spinner from './Spinner';
import ErrorBanner from './ErrorBanner';

export default function ConfirmModal({
  open,
  onClose,
  title,
  confirmLabel,
  onConfirm,
  busy = false,
  disabled = false,
  error = null,
  children,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {children}
      <ErrorBanner message={error} className="mt-4" />
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-muted/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || disabled}
          className="flex items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Spinner /> : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

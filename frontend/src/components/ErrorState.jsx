import { AlertTriangle } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import EmptyState from './EmptyState';

export default function ErrorState({ title, error, onRetry }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      message={getErrorMessage(error)}
      action={
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      }
    />
  );
}

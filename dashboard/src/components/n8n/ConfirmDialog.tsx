import { AlertTriangle, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-n2f-card border border-n2f-border rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-900/30 p-2 rounded-full">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-n2f-text">{title}</h3>
          <button onClick={onCancel} className="ml-auto text-n2f-text-muted hover:text-n2f-text">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-n2f-text-secondary mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-n2f-text border border-n2f-border rounded-lg hover:bg-n2f-elevated">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  );
}

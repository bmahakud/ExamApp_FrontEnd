import { AlertTriangle, Loader2 } from 'lucide-react';

interface PatternLimitConfirmModalProps {
  isOpen: boolean;
  message: string;
  confirming: boolean;
  onCancel: () => void;
  onProceed: () => void;
}

export default function PatternLimitConfirmModal({
  isOpen,
  message,
  confirming,
  onCancel,
  onProceed,
}: PatternLimitConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-base font-bold text-amber-900">Pattern Limit Exceeded</h3>
        </div>

        <div className="p-6 space-y-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">{message}</p>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            Proceeding will <strong>permanently delete</strong> the existing questions in this exam
            and replace them with the new set.
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onProceed}
            disabled={confirming}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {confirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Replacing...
              </>
            ) : (
              'Proceed'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

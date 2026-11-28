import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { AlertTriangle, Check, Loader2, Search, Trash2, X } from 'lucide-react';
import { api, getErrorMessage } from '../hooks/useApi';

interface ExamQuestionItem {
  id: number;
  question_number?: number;
  question_text?: string;
  subject?: string;
  correct_answer?: string | null;
}

interface ExamBulkCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: number;
  examTitle: string;
  totalQuestionsAdded: number;
  onCompleted: () => void;
}

export default function ExamBulkCleanupModal({
  isOpen,
  onClose,
  examId,
  examTitle,
  totalQuestionsAdded,
  onCompleted,
}: ExamBulkCleanupModalProps) {
  const [scope, setScope] = useState<'all' | 'specific'>('all');
  const [deleteQuestions, setDeleteQuestions] = useState(false);
  const [deleteAnswers, setDeleteAnswers] = useState(false);

  const [questions, setQuestions] = useState<ExamQuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset modal state whenever opened
  useEffect(() => {
    if (!isOpen) return;
    setScope('all');
    setDeleteQuestions(false);
    setDeleteAnswers(false);
    setSelectedIds([]);
    setSearchQuery('');
  }, [isOpen]);

  // Fetch exam questions when switching to specific selection
  useEffect(() => {
    if (!isOpen || scope !== 'specific' || questions.length > 0) return;

    const loadQuestions = async () => {
      try {
        setLoadingQuestions(true);
        const res = await api.get(`/questions/questions/?exam=${examId}&page_size=500`);
        const list: ExamQuestionItem[] = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.results)
            ? res.data.results
            : [];
        const sorted = [...list].sort(
          (a, b) => (a.question_number ?? 0) - (b.question_number ?? 0) || a.id - b.id
        );
        setQuestions(sorted);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load exam questions.'));
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, [isOpen, scope, examId, questions.length]);

  // Clear cached questions when modal closes so next open gets fresh list
  useEffect(() => {
    if (!isOpen) {
      setQuestions([]);
    }
  }, [isOpen]);

  const filteredQuestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter((item) => {
      const num = item.question_number != null ? `q${item.question_number}` : '';
      const text = (item.question_text || '').toLowerCase();
      const subj = (item.subject || '').toLowerCase();
      return (
        num.includes(q) ||
        String(item.question_number ?? '').includes(q) ||
        text.includes(q) ||
        subj.includes(q)
      );
    });
  }, [questions, searchQuery]);

  if (!isOpen) return null;

  const toggleId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredQuestions.map((q) => q.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const clearSelection = () => setSelectedIds([]);

  const canSubmit =
    (deleteQuestions || deleteAnswers) &&
    (scope === 'all' || selectedIds.length > 0) &&
    !submitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      const payload: Record<string, unknown> = {
        scope,
        delete_questions: deleteQuestions,
        delete_answers: deleteAnswers,
      };
      if (scope === 'specific') {
        payload.question_ids = selectedIds;
      }

      const res = await api.post(`/questions/exams/${examId}/bulk-cleanup/`, payload);
      const deletedCount = res.data?.deleted_questions ?? 0;
      const clearedCount = res.data?.cleared_answers ?? 0;

      const parts: string[] = [];
      if (deleteQuestions) parts.push(`${deletedCount} question(s) deleted`);
      if (deleteAnswers) parts.push(`${clearedCount} answer(s) cleared`);
      toast.success(parts.length ? parts.join(', ') : 'Cleanup completed.');

      onCompleted();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to clean up exam questions/answers.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 px-4 sm:px-6 py-4 border-b border-red-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-red-900 truncate">
                Delete Questions / Answers
              </h3>
              <p className="text-xs text-red-700 truncate">
                Applies only to <span className="font-semibold">{examTitle}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Target Scope
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                  scope === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All (Bulk · {totalQuestionsAdded})
              </button>
              <button
                type="button"
                onClick={() => setScope('specific')}
                className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                  scope === 'specific'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Specific Question(s)
              </button>
            </div>
          </div>

          {/* Action Tick Options */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              What do you want to delete?
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                deleteQuestions
                  ? 'border-red-300 bg-red-50/60'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={deleteQuestions}
                onChange={(e) => setDeleteQuestions(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">
                  {scope === 'all' ? 'Delete Bulk Questions' : 'Delete Selected Questions'}
                </p>
                <p className="text-xs text-slate-500">
                  Permanently removes the {scope === 'all' ? 'all extracted/added' : 'selected'}{' '}
                  questions (and their answers) from this exam.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                deleteAnswers
                  ? 'border-amber-300 bg-amber-50/60'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={deleteAnswers}
                onChange={(e) => setDeleteAnswers(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">
                  {scope === 'all' ? 'Delete Bulk Answers' : 'Delete / Clear Selected Answers'}
                </p>
                <p className="text-xs text-slate-500">
                  Clears saved correct answers on {scope === 'all' ? 'all' : 'selected'} questions
                  so you can re-upload or re-enter them without losing questions.
                </p>
              </div>
            </label>
          </div>

          {/* Specific Question Picker */}
          {scope === 'specific' && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Q#, subject, text..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    Clear ({selectedIds.length})
                  </button>
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                {loadingQuestions ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading exam questions...
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No matching questions found in this exam.
                  </div>
                ) : (
                  filteredQuestions.map((item) => {
                    const checked = selectedIds.includes(item.id);
                    const hasAnswer = Boolean(item.correct_answer && String(item.correct_answer).trim());
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 ${
                          checked ? 'bg-indigo-50/50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleId(item.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                        />
                        <span className="font-mono font-semibold text-slate-700 shrink-0">
                          Q{item.question_number ?? item.id}
                        </span>
                        <span className="text-slate-600 truncate flex-1">
                          {item.question_text || 'Untitled question'}
                        </span>
                        {hasAnswer ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium shrink-0">
                            <Check className="w-2.5 h-2.5" /> Ans
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-[10px] shrink-0">
                            No ans
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Warning */}
          {(deleteQuestions || deleteAnswers) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                This action cannot be undone. Only this exam is affected; other exams are untouched.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

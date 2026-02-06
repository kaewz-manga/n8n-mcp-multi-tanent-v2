import { useState } from 'react';
import { MessageSquarePlus, X, CheckCircle, Loader2 } from 'lucide-react';
import { submitFeedback } from '../lib/api';

const categories = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'general', label: 'General Feedback' },
  { value: 'question', label: 'Question' },
];

export default function FeedbackBubble() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.length < 10) {
      setError('Message must be at least 10 characters');
      return;
    }
    setError('');
    setSubmitting(true);

    const res = await submitFeedback(category, message);
    setSubmitting(false);

    if (res.success) {
      setSuccess(true);
      setMessage('');
      setCategory('general');
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 2000);
    } else {
      setError(res.error?.message || 'Failed to submit feedback');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Panel */}
      {open && (
        <div className="absolute bottom-16 right-0 w-80 bg-n2f-card border border-n2f-border rounded-lg shadow-2xl overflow-hidden">
          {success ? (
            <div className="flex flex-col items-center justify-center p-8 gap-3">
              <CheckCircle className="h-10 w-10 text-green-400" />
              <p className="text-n2f-text font-medium">Thank you!</p>
              <p className="text-n2f-text-secondary text-sm">Your feedback has been submitted.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="px-4 py-3 border-b border-n2f-border">
                <h3 className="text-sm font-semibold text-n2f-text">Send Feedback</h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-n2f-text-secondary mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-n2f-elevated border border-n2f-border rounded-lg text-n2f-text focus:outline-none focus:ring-2 focus:ring-n2f-accent focus:border-transparent"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-n2f-text-secondary mb-1">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    rows={4}
                    maxLength={2000}
                    className="w-full px-3 py-2 text-sm bg-n2f-elevated border border-n2f-border rounded-lg text-n2f-text placeholder-n2f-text-muted focus:outline-none focus:ring-2 focus:ring-n2f-accent focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-n2f-text-muted mt-1">{message.length}/2000</p>
                </div>
                {error && (
                  <p className="text-xs text-red-400">{error}</p>
                )}
              </div>
              <div className="px-4 py-3 border-t border-n2f-border flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || message.length < 10}
                  className="bg-n2f-accent hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {submitting ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Bubble button */}
      <button
        onClick={() => { setOpen(!open); setError(''); setSuccess(false); }}
        className="h-14 w-14 rounded-full bg-n2f-accent hover:bg-orange-600 text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
        title={open ? 'Close feedback' : 'Send feedback'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquarePlus className="h-6 w-6" />}
      </button>
    </div>
  );
}

const colors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  running: 'bg-blue-100 text-blue-700',
  new: 'bg-blue-100 text-blue-700',
  crashed: 'bg-red-100 text-red-700',
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>
      {status}
    </span>
  );
}

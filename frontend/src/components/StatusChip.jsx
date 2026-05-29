const STYLES = {
  pending:     "bg-orange-50 text-orange-700 border-orange-200",
  reviewing:   "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-300",
  resolved:    "bg-green-50 text-green-700 border-green-200",
  rejected:    "bg-red-50 text-red-700 border-red-200",
};

const LABELS = {
  pending: "Pending",
  reviewing: "Reviewing",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
};

export default function StatusChip({ status }) {
  const cls = STYLES[status] || STYLES.pending;
  return (
    <span className={`inline-flex items-center text-xs font-semibold uppercase px-2 py-1 rounded-full border ${cls}`}>
      {LABELS[status] || status}
    </span>
  );
}
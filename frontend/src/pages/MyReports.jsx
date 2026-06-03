import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ClipboardList, MapPin, FilePlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "../api";
import StatusChip from "../components/StatusChip";

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const { state } = useLocation();
  const justCreatedId = state?.newReportId;

  useEffect(() => {
    api
      .get("/reports")
      .then((r) => setReports(r.data))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Dashboard summary
  const totals = {
    total: reports.length,
    resolved: reports.filter((r) => r.current_status === "resolved").length,
    inProgress: reports.filter((r) =>
      ["in_progress", "reviewing"].includes(r.current_status)
    ).length,
    pending: reports.filter((r) => r.current_status === "pending").length,
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-ink">My Reports</h1>
          <p className="text-muted mt-1">Track your submissions and their status.</p>
        </div>
        <Link
          to="/report"
          className="bg-accent hover:bg-primary text-white font-semibold px-4 py-2 rounded flex items-center gap-2"
        >
          <FilePlus className="w-4 h-4" /> New Report
        </Link>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Total" value={totals.total} />
        <SummaryCard label="Resolved" value={totals.resolved} accent="text-success" />
        <SummaryCard label="In Progress" value={totals.inProgress} accent="text-primary" />
        <SummaryCard label="Pending" value={totals.pending} accent="text-navy" />
      </div>

      {justCreatedId && (
        <div className="bg-green-50 border border-green-200 text-success rounded p-3 text-sm">
          ✓ Report #{justCreatedId} submitted successfully.
        </div>
      )}

      {/* List */}
      {loading && <p className="text-muted">Loading…</p>}
      {err && <p className="text-error">{err}</p>}

      {!loading && reports.length === 0 && (
        <div className="bg-white border border-outline rounded-lg p-10 text-center">
          <ClipboardList className="w-10 h-10 mx-auto text-muted mb-3" />
          <p className="text-ink font-semibold">No reports yet</p>
          <p className="text-muted text-sm mt-1">
            Tap <Link to="/report" className="text-accent font-semibold">New Report</Link> to submit your first one.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {reports.map((r) => (
          <article
            key={r.report_id}
            className="bg-white border border-outline rounded-lg p-4 hover:border-accent transition-colors"
          >
            <div className="flex gap-3">
              {r.image_url && (
                <img
                  src={r.image_url}
                  alt=""
                  loading="lazy"
                  className="w-20 h-20 rounded object-cover flex-shrink-0 bg-surface-container"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      #{r.report_id} · {r.category.category_name}
                      {r.cluster && r.cluster.repeated_count > 1 && (
                        <span className="ml-2 inline-flex items-center gap-1 bg-orange-50 text-primary border border-orange-200 rounded-full px-2 py-0.5 text-xs font-semibold">
                          {r.cluster.repeated_count}× reported
                        </span>
                      )}
                    </p>
                    <h3 className="font-semibold text-ink mt-0.5">
                      {r.title || r.description.slice(0, 80)}
                    </h3>
                  </div>
                  <StatusChip status={r.current_status} />
                </div>
                <p className="text-sm text-muted line-clamp-2">{r.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted mt-3">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {r.location.city || `${r.location.latitude.toFixed(3)}, ${r.location.longitude.toFixed(3)}`}
                  </span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent = "text-ink" }) {
  return (
    <div className="bg-white border border-outline rounded-lg p-4">
      <div className={`text-3xl font-bold ${accent}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted font-semibold mt-1">{label}</div>
    </div>
  );
}
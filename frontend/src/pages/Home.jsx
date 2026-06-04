import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, CircleDashed, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "../api";
import StatusChip from "../components/StatusChip";

export default function Home() {
  const [reports, setReports] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/reports")
      .then((r) => setReports(r.data))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const resolvedCount = reports.filter((r) => r.current_status === "resolved").length;
  const inProgressCount = reports.filter((r) =>
    ["in_progress", "reviewing"].includes(r.current_status)
  ).length;
  const recent = reports.slice(0, 3);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl lg:text-4xl font-bold text-ink">Hello, Citizen</h1>
        <p className="text-muted mt-1">
          Your reports help make the city a better place. What would you like to update us on today?
        </p>
      </header>

      {/* Report an Issue hero card */}
      <Link
        to="/report"
        className="block bg-accent hover:bg-primary text-white rounded-lg p-5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <ArrowRight className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">Report an Issue</h2>
            <p className="text-white/85 text-sm">AI-assisted reporting in 30 seconds</p>
          </div>
          <ArrowRight className="w-5 h-5" />
        </div>
      </Link>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={BadgeCheck}
          iconBg="bg-orange-50"
          iconColor="text-primary"
          value={resolvedCount}
          label="Resolved"
        />
        <StatCard
          icon={CircleDashed}
          iconBg="bg-blue-50"
          iconColor="text-navy"
          value={inProgressCount.toString().padStart(2, "0")}
          label="In Progress"
        />
      </div>

      {/* High Impact User banner */}
      <div className="bg-surface-container rounded-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="font-semibold text-ink">High Impact User</p>
          <p className="text-sm text-muted">Top 15% of contributors this month</p>
        </div>
      </div>

      {/* Recent Reports */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-ink">Recent Reports</h2>
          <Link to="/my" className="text-accent text-sm font-semibold hover:underline">
            View All
          </Link>
        </div>
        {loading && <p className="text-muted">Loading…</p>}
        {err && <p className="text-error">{err}</p>}
        {!loading && recent.length === 0 && (
          <div className="bg-white border border-outline rounded-lg p-6 text-center text-muted">
            No reports yet. <Link to="/report" className="text-accent font-semibold">Submit your first one</Link>.
          </div>
        )}
        <div className="space-y-3">
          {recent.map((r) => (
            <ReportCard key={r.report_id} report={r} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, value, label }) {
  return (
    <div className="bg-white border border-outline rounded-lg p-4">
      <div className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center mb-2`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="text-3xl font-bold text-ink">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted font-semibold mt-1">{label}</div>
    </div>
  );
}

function ReportCard({ report }) {
  return (
    <Link
      to={`/reports/${report.report_id}`}
      className="block bg-white border border-outline rounded-lg p-4 hover:border-accent transition-colors"
    >
      <div className="flex items-start gap-3">
        {report.image_url ? (
          <img
            src={report.image_url}
            alt=""
            loading="lazy"
            className="w-16 h-16 rounded object-cover flex-shrink-0 bg-surface-container"
          />
        ) : (
          <div className="w-16 h-16 bg-surface-container rounded flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-ink truncate">
              {report.title || report.category.category_name}
            </h3>
            <StatusChip status={report.current_status} />
          </div>
          <p className="text-sm text-muted mt-1 truncate">
            {report.location.city || "Unknown location"} ·{" "}
            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Link>
  );
}
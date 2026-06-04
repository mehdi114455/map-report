import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { ClipboardList, AlertTriangle, Layers, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import StatusChip from "../components/StatusChip";
import { useReportsSocket } from "../lib/useReportsSocket";
import { Link } from "react-router-dom";

const STATUS_OPTIONS = ["pending", "reviewing", "in_progress", "resolved", "rejected"];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [urgent, setUrgent] = useState([]);
  const [err, setErr] = useState("");

  async function refreshAll() {
    try {
      const [s, h, u] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/hotspots"),
        api.get("/admin/urgent"),
      ]);
      setStats(s.data);
      setHotspots(h.data);
      setUrgent(u.data);
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  }

  useEffect(() => { refreshAll(); }, []);

  // Refresh dashboard when any status change comes through.
  useReportsSocket((msg) => {
    if (msg.type === "status_change") refreshAll();
  });

  async function setStatus(reportId, newStatus) {
    try {
      const res = await api.patch(`/reports/${reportId}/status`, { status: newStatus });
      // Response is now a list of affected reports (one if standalone, many if cluster).
      const updated = res.data;
      const updatedIds = new Set(updated.map((r) => r.report_id));
      setUrgent((curr) =>
        curr.map((r) => (updatedIds.has(r.report_id) ? { ...r, current_status: newStatus } : r))
      );
    } catch (e) {
      alert(e.response?.data?.detail || e.message);
    }
  }

  const center = hotspots[0]
    ? [hotspots[0].latitude, hotspots[0].longitude]
    : [25.2854, 51.531];

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h1 className="text-3xl font-bold text-ink">System Dashboard</h1>
        <p className="text-muted mt-1">Real-time monitoring of civic reports and infrastructure status.</p>
      </header>

      {err && <div className="bg-red-50 border border-red-200 text-error rounded p-3 text-sm">{err}</div>}

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          icon={ClipboardList} iconColor="text-navy" iconBg="bg-blue-50"
          label="Total Reports" value={stats?.total ?? "—"}
          sub={stats ? `+${stats.this_week} this week` : ""}
        />
        <StatCard
          icon={AlertTriangle} iconColor="text-primary" iconBg="bg-orange-50"
          label="Open Issues" value={stats?.open ?? "—"}
          sub="Needs review"
        />
        <StatCard
          icon={Layers} iconColor="text-accent" iconBg="bg-orange-100"
          label="Duplicate Clusters" value={stats?.clusters ?? "—"}
          sub="AI grouped"
        />
      </div>

      {/* Hotspot map */}
      <section className="bg-white border border-outline rounded-lg p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-xl font-bold text-ink">Hotspot Map</h2>
          <span className="text-xs text-muted">
            {hotspots.length} active cluster{hotspots.length === 1 ? "" : "s"}
          </span>
        </div>

        {hotspots.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-outline p-10 text-center text-muted">
            <p>No duplicate clusters yet.</p>
            <p className="text-xs mt-1">Hotspots appear when multiple residents report the same issue nearby.</p>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border border-outline" style={{ height: 420 }}>
            <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
              {/* Lighter, English-labeled tiles read better than default OSM for a dashboard. */}
              <TileLayer
                attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; OpenStreetMap'
                url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
              />
              {hotspots.map((h) => {
                // Scale circle radius (in pixels) with repeat count, with a sensible floor and cap.
                const radius = Math.min(40, 12 + h.repeated_count * 5);
                return (
                  <CircleMarker
                    key={h.cluster_id}
                    center={[h.latitude, h.longitude]}
                    radius={radius}
                    pathOptions={{
                      color: "#E87722",
                      weight: 2,
                      fillColor: "#E87722",
                      fillOpacity: 0.4,
                    }}
                  >
                    <Popup>
                      <div className="space-y-1 min-w-[180px]">
                        <p className="font-semibold">Cluster #{h.cluster_id}</p>
                        <p className="text-sm">{h.repeated_count} reports merged</p>
                        <p className="text-xs text-gray-500">Status: {h.cluster_status}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        )}

        <p className="text-xs text-muted mt-3">
          Circle size scales with the number of merged reports. Larger circles = more residents affected.
        </p>
      </section>

      {/* Urgent reports */}
      <section>
        <h2 className="text-xl font-bold text-ink mb-3">Urgent Reports</h2>
        {urgent.length === 0 && (
          <p className="text-muted">Nothing urgent right now — everything's been reviewed.</p>
        )}

<div className="space-y-3">
          {urgent.map((r) => (
            <article key={r.report_id} className="bg-white border border-outline rounded-lg p-4 hover:border-accent transition-colors">
              <Link to={`/reports/${r.report_id}`} className="block">
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
                          #{r.report_id} · {r.category_name}
                          {r.repeated_count > 1 && (
                            <span className="ml-2 inline-flex items-center gap-1 bg-orange-50 text-primary border border-orange-200 rounded-full px-2 py-0.5 text-xs font-semibold">
                              {r.repeated_count}× reported
                            </span>
                          )}
                        </p>
                        <h3 className="font-semibold text-ink mt-0.5">{r.title}</h3>
                      </div>
                      <StatusChip status={r.current_status} />
                    </div>
                    <p className="text-sm text-muted line-clamp-2">{r.description}</p>
                    <span className="text-xs text-muted mt-3 block">
                      {r.city || `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}`}
                      {" · "}
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </Link>
              {/* Status selector OUTSIDE the link so clicks don't navigate */}
              <div className="flex justify-end mt-3 pt-3 border-t border-outline">
                <select
                  value={r.current_status}
                  onChange={(e) => { e.stopPropagation(); setStatus(r.report_id, e.target.value); }}
                  className="text-sm border border-outline rounded px-2 py-1 focus:border-navy outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
             </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="bg-white border border-outline rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs uppercase tracking-wide text-muted font-semibold">{label}</div>
        <div className={`w-9 h-9 ${iconBg} rounded flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-ink">{value}</div>
      <div className="text-xs text-muted mt-1 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" /> {sub}
      </div>
    </div>
  );
}
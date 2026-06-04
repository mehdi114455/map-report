import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { ArrowLeft, MapPin, Users, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import StatusChip from "../components/StatusChip";

const STATUS_OPTIONS = ["pending", "reviewing", "in_progress", "resolved", "rejected"];

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [err, setErr] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) return;
    user.getIdTokenResult().then((res) => setIsAdmin(res.claims.role === "admin"));
  }, [user]);

  async function load() {
    try {
      const res = await api.get(`/reports/${id}/detail`);
      setData(res.data);
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function changeStatus(newStatus) {
    setUpdating(true);
    try {
      await api.patch(`/reports/${id}/status`, { status: newStatus });
      await load();
    } catch (e) {
      alert(e.response?.data?.detail || e.message);
    } finally {
      setUpdating(false);
    }
  }

  if (err) return <div className="text-error">{err}</div>;
  if (!data) return <p className="text-muted">Loading…</p>;

  const { report, cluster, history } = data;

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <header className="bg-white border border-outline rounded-lg p-5">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <p className="text-xs text-muted">
              #{report.report_id} · {report.category.category_name}
              {cluster && (
                <span className="ml-2 inline-flex items-center gap-1 bg-orange-50 text-primary border border-orange-200 rounded-full px-2 py-0.5 text-xs font-semibold">
                  <Users className="w-3 h-3" /> {cluster.repeated_count}× reported
                </span>
              )}
            </p>
            <h1 className="text-2xl font-bold text-ink mt-1">
              {report.title || report.description.slice(0, 80)}
            </h1>
          </div>
          <StatusChip status={report.current_status} />
        </div>

        {report.image_url && (
          <img
            src={report.image_url}
            alt=""
            className="w-full max-h-96 object-cover rounded mb-4 bg-surface-container"
          />
        )}

        <p className="text-ink whitespace-pre-wrap">{report.description}</p>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted mt-4">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {report.location.city || `${report.location.latitude.toFixed(4)}, ${report.location.longitude.toFixed(4)}`}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
          </span>
          {report.ai_confidence != null && (
            <span className="text-xs">AI confidence: {(report.ai_confidence * 100).toFixed(0)}%</span>
          )}
        </div>

        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-outline flex items-center gap-3">
            <label className="text-sm font-semibold text-ink">Update status:</label>
            <select
              value={report.current_status}
              onChange={(e) => changeStatus(e.target.value)}
              disabled={updating}
              className="text-sm border border-outline rounded px-2 py-1 focus:border-navy outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
            {cluster && (
              <span className="text-xs text-muted">
                Will update all {cluster.repeated_count} reports in this cluster.
              </span>
            )}
          </div>
        )}
      </header>

      {/* Map */}
      <section className="bg-white border border-outline rounded-lg p-5">
        <h2 className="font-bold text-ink mb-3">Location</h2>
        <div className="rounded-lg overflow-hidden border border-outline" style={{ height: 280 }}>
          <MapContainer
            center={[report.location.latitude, report.location.longitude]}
            zoom={16}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <Marker position={[report.location.latitude, report.location.longitude]} />
          </MapContainer>
        </div>
      </section>

      {/* Cluster members */}
      {cluster && cluster.members.length > 1 && (
        <section className="bg-white border border-outline rounded-lg p-5">
          <h2 className="font-bold text-ink mb-3">Related reports in this cluster</h2>
          <div className="space-y-2">
            {cluster.members.map((m) => (
              <div
                key={m.report_id}
                className={`border rounded p-3 ${m.report_id === report.report_id ? "border-accent bg-orange-50" : "border-outline"}`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-xs text-muted">
                      #{m.report_id}
                      {m.report_id === report.report_id && <span className="ml-2 text-accent font-semibold">(this one)</span>}
                    </p>
                    <p className="text-sm text-ink mt-0.5">{m.description}</p>
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Status history */}
      {history.length > 0 && (
        <section className="bg-white border border-outline rounded-lg p-5">
          <h2 className="font-bold text-ink mb-3">Status history</h2>
          <ol className="space-y-3">
            {history.map((h, i) => (
              <li key={i} className="flex gap-3">
                <div className="w-2 h-2 mt-1.5 bg-accent rounded-full flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {h.status.replace("_", " ")}
                  </p>
                  <p className="text-xs text-muted">
                    {format(new Date(h.updated_at), "PPp")}
                  </p>
                  {h.status_note && <p className="text-sm text-muted mt-1">{h.status_note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
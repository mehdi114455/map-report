import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { formatDistanceToNow } from "date-fns";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { api } from "../api";
import StatusChip from "../components/StatusChip";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function MapScreen() {
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/reports").then((r) => setReports(r.data)).catch((e) => setErr(e.message));
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const filtered = useMemo(
    () => (categoryFilter ? reports.filter((r) => r.category.category_id === categoryFilter) : reports),
    [reports, categoryFilter]
  );

  const first = filtered[0] || reports[0];
  const center = first
    ? [first.location.latitude, first.location.longitude]
    : [25.2854, 51.531];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold text-ink">Reports Map</h1>
        <p className="text-muted mt-1">
          {filtered.length} report{filtered.length === 1 ? "" : "s"} pinned
          {categoryFilter && ` · filtered by ${categories.find(c => c.category_id === categoryFilter)?.category_name}`}
        </p>
      </header>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${!categoryFilter ? "bg-accent text-white border-accent" : "bg-white text-ink border-outline"}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.category_id}
              onClick={() => setCategoryFilter(c.category_id)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${categoryFilter === c.category_id ? "bg-accent text-white border-accent" : "bg-white text-ink border-outline"}`}
            >
              {c.category_name}
            </button>
          ))}
        </div>
      )}

      {err && <p className="text-error">{err}</p>}

      <div className="rounded-lg overflow-hidden border border-outline" style={{ height: "65vh" }}>
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; OpenStreetMap'
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
          />
          {filtered.map((r) => (
            <Marker key={r.report_id} position={[r.location.latitude, r.location.longitude]}>
              <Popup>
                <div className="space-y-1 min-w-[200px]">
                  {r.image_url && (
                    <img src={r.image_url} alt="" className="w-full h-24 object-cover rounded mb-2" />
                  )}
                  <p className="text-xs text-gray-500">#{r.report_id} · {r.category.category_name}</p>
                  <p className="font-semibold">{r.title || r.description.slice(0, 60)}</p>
                  <StatusChip status={r.current_status} />
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                  <Link
                    to={`/reports/${r.report_id}`}
                    className="text-accent text-sm font-semibold hover:underline inline-block mt-1"
                  >
                    View details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
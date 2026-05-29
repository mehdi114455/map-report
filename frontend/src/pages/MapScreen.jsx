import { formatDistanceToNow } from "date-fns";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { api } from "../api";
import StatusChip from "../components/StatusChip";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
});


export default function MapScreen() {
  const [reports, setReports] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/reports").then((r) => setReports(r.data)).catch((e) => setErr(e.message));
  }, []);

  // Center on the first report or fall back to Doha,Qatar
  const first = reports[0];
  const center = first
    ? [first.location.latitude, first.location.longitude]
    : [25.2854, 51.531];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-3xl font-bold text-ink">Reports Map</h1>
        <p className="text-muted mt-1">{reports.length} report{reports.length === 1 ? "" : "s"} pinned.</p>
      </header>
      {err && <p className="text-error">{err}</p>}
      <div className="rounded-lg overflow-hidden border border-outline" style={{ height: "70vh" }}>
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
{/*          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />*/}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          {reports.map((r) => (
            <Marker key={r.report_id} position={[r.location.latitude, r.location.longitude]}>
              <Popup>
                <div className="space-y-1 min-w-[180px]">
                  <p className="text-xs text-gray-500">#{r.report_id} · {r.category.category_name}</p>
                  <p className="font-semibold">{r.title || r.description.slice(0, 60)}</p>
                  <StatusChip status={r.current_status} />
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
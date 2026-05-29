import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Image as ImageIcon, Loader2 } from "lucide-react";
import { api } from "../api";
import MapPicker from "../components/MapPicker";

export default function NewReport() {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(null);
  const [city, setCity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [locating, setLocating] = useState(false);

  // "Use my location" button uses browser geolocation API.
  function useMyLocation() {
    if (!navigator.geolocation) {
      setErr("Your browser doesn't support geolocation.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocating(false);
      },
      (e) => {
        setErr(`Could not get your location: ${e.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    // client-side location check before submit
    if (!location) {
      setErr("Please pick a location on the map or use your current location.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        description: description.trim(),
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          city: city.trim() || undefined,
        },
      };
      const res = await api.post("/reports", payload);
      // Success - go to My Reports so the user sees it land
      navigate("/my", { state: { newReportId: res.data.report_id } });
    } catch (e) {
      const detail = e.response?.data?.detail;
      setErr(
        typeof detail === "string"
          ? detail
          : detail?.[0]?.msg || e.message || "Failed to submit report."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8">
      <header>
        <h1 className="text-3xl font-bold text-ink">Report an Issue</h1>
        <p className="text-muted mt-1">
          Describe the issue in your own words. Our AI will categorize it automatically.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5 bg-white border border-outline rounded-lg p-5">
        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">
            Describe the issue
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={5}
            maxLength={2000}
            rows={4}
            placeholder="e.g. There's a large pothole on the corner of Main and 4th. It's been there for weeks."
            className="w-full border border-outline rounded px-3 py-2 focus:border-navy outline-none resize-none"
          />
          <p className="text-xs text-muted mt-1">{description.length} / 2000</p>
        </div>

        {/* Photo placeholder */}
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">
            Photo (optional)
          </label>
          <div className="border-2 border-dashed border-outline rounded-lg p-6 flex flex-col items-center justify-center text-muted">
            <ImageIcon className="w-8 h-8 mb-2" />
            <p className="text-sm">Photo upload coming soon</p>
          </div>
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-ink">
              Location <span className="text-error">*</span>
            </label>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="text-sm text-accent font-semibold flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              Use my location
            </button>
          </div>
          <p className="text-xs text-muted mb-2">Tap the map to drop a pin.</p>
          <MapPicker value={location} onChange={setLocation} height={280} />
          {location && (
            <p className="text-xs text-muted mt-2">
              Pinned at {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </p>
          )}
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (optional)"
            className="mt-2 w-full border border-outline rounded px-3 py-2 focus:border-navy outline-none"
          />
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-error rounded p-3 text-sm">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-accent hover:bg-primary text-white font-semibold py-3 rounded flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Submitting…" : "Submit Report"}
        </button>
      </form>
    </div>
  );
}
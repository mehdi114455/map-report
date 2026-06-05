import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Image as ImageIcon, Loader2, X } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { uploadReportImage, validateImage, UploadError } from "../lib/uploadImage";
import MapPicker from "../components/MapPicker";

export default function NewReport() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(null);
  // const [city, setCity] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileError, setFileError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [err, setErr] = useState("");
  const [locating, setLocating] = useState(false);

  // Clean up the object URL when the file changes.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onPickFile(f) {
    setFileError("");
    if (!f) return;
    try {
      validateImage(f);
      setFile(f);
    } catch (e) {
      setFileError(e.message);
      setFile(null);
    }
  }

  function removeFile() {
    setFile(null);
    setFileError("");
  }

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

    if (!location) {
      setErr("Please pick a location on the map or use your current location.");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = null;

      // 1) Upload the image.
      if (file) {
        setSubmitStatus("Uploading photo…");
        imageUrl = await uploadReportImage(file, user.uid, (pct) => {
          setSubmitStatus(`Uploading photo… ${Math.round(pct)}%`);
        });
      }

      // 2) Create the report row with the URL attached.
      setSubmitStatus("Saving report…");
      const payload = {
        description: description.trim(),
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          // city: city.trim() || undefined,
        },
        image_url: imageUrl,
      };
      const res = await api.post("/reports", payload);
      navigate("/my", { state: { newReportId: res.data.report_id } });
    } catch (e) {
      if (e instanceof UploadError) {
        setErr(e.message);
      } else {
        const detail = e.response?.data?.detail;
        setErr(
          typeof detail === "string"
            ? detail
            : detail?.[0]?.msg || e.message || "Failed to submit report."
        );
      }
    } finally {
      setSubmitting(false);
      setSubmitStatus("");
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
            placeholder="e.g. There's a large pothole on Salwa Road."
            className="w-full border border-outline rounded px-3 py-2 focus:border-navy outline-none resize-none"
          />
          <p className="text-xs text-muted mt-1">{description.length} / 2000</p>
        </div>

        {/* Photo - upload */}
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">
            Photo (optional)
          </label>
          {file && previewUrl ? (
            <div className="relative border border-outline rounded-lg overflow-hidden">
              <img src={previewUrl} alt="" className="w-full h-56 object-cover" />
              <button
                type="button"
                onClick={removeFile}
                className="absolute top-2 right-2 bg-white/95 hover:bg-white rounded-full p-1.5 shadow-md"
                aria-label="Remove photo"
              >
                <X className="w-4 h-4 text-ink" />
              </button>
              <p className="text-xs text-muted px-3 py-2 bg-surface-container">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          ) : (
            <label className="border-2 border-dashed border-outline hover:border-accent rounded-lg p-6 flex flex-col items-center justify-center text-muted cursor-pointer transition-colors">
              <ImageIcon className="w-8 h-8 mb-2" />
              <p className="text-sm font-semibold text-ink">Choose a photo</p>
              <p className="text-xs mt-1">JPG, PNG, or WebP — up to 5 MB</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
            </label>
          )}
          {fileError && (
            <p className="text-error text-sm mt-1.5">{fileError}</p>
          )}
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
{/*          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (optional)"
            className="mt-2 w-full border border-outline rounded px-3 py-2 focus:border-navy outline-none"
          />
*/}        </div>

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
          {submitStatus || (submitting ? "Submitting…" : "Submit Report")}
        </button>
      </form>
    </div>
  );
}
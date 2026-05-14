import { useEffect, useMemo, useState } from "react";
import { CloudSun, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

const LOCATION_STORAGE_KEY = "familyWall.calendar.location";

function readSavedLocation() {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveLocation(location) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
}

function permissionLabel(status) {
  if (status === "granted") return "Location On";
  if (status === "denied") return "Location Blocked";
  if (status === "loading") return "Locating...";
  return "Allow Location";
}

export default function FamilyCalendarWeatherWidget() {
  const savedLocation = readSavedLocation();
  const [location, setLocation] = useState(() => savedLocation);
  const [status, setStatus] = useState(() => (savedLocation ? "granted" : "idle"));
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function readPermission() {
      if (!navigator?.permissions?.query) return;
      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        if (mounted && result.state === "denied") setStatus("denied");
      } catch {
        // Some browsers do not allow geolocation permission checks.
      }
    }

    readPermission();
    return () => {
      mounted = false;
    };
  }, []);

  const coordinatesText = useMemo(() => {
    if (!location?.latitude || !location?.longitude) return "--°";
    return `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;
  }, [location]);

  function requestLocation() {
    if (!navigator?.geolocation) {
      setStatus("unavailable");
      setError("Location is not available in this browser.");
      return;
    }

    setStatus("loading");
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          updatedAt: new Date().toISOString(),
        };
        saveLocation(nextLocation);
        setLocation(nextLocation);
        setStatus("granted");
      },
      (locationError) => {
        setStatus(locationError.code === locationError.PERMISSION_DENIED ? "denied" : "idle");
        setError(locationError.message || "Unable to get location.");
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 1000 * 60 * 30,
      }
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-4 text-xs font-bold text-slate-500">
        <button
          type="button"
          onClick={requestLocation}
          className={cn(
            "inline-flex items-center gap-1 transition hover:text-blue-600",
            status === "granted" && "text-emerald-600",
            status === "denied" && "text-rose-500"
          )}
        >
          <MapPin className="h-3.5 w-3.5 text-pink-500" /> {permissionLabel(status)}
        </button>
        <span className="inline-flex items-center gap-1">
          <CloudSun className="h-4 w-4" /> {status === "granted" ? coordinatesText : "--°"}
        </span>
      </div>
      {error && <p className="max-w-[280px] text-right text-[10px] font-semibold text-rose-400">{error}</p>}
    </div>
  );
}

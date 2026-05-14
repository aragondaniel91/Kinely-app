import { useEffect, useMemo, useState } from "react";
import { CloudSun, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCurrentWeatherByCoordinates, hasWeatherApiKey } from "@/core/weather/weatherService";

const LOCATION_STORAGE_KEY = "familyWall.calendar.location";
const WEATHER_STORAGE_KEY = "familyWall.calendar.weather";
const WEATHER_CACHE_MS = 1000 * 60 * 20;

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

function readSavedWeather() {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(WEATHER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveWeather(weather) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WEATHER_STORAGE_KEY, JSON.stringify(weather));
}

function permissionLabel(status) {
  if (status === "granted") return "Location On";
  if (status === "denied") return "Location Blocked";
  if (status === "loading") return "Locating...";
  return "Allow Location";
}

function isFreshWeather(weather) {
  if (!weather?.updatedAt) return false;
  return Date.now() - new Date(weather.updatedAt).getTime() < WEATHER_CACHE_MS;
}

function weatherText(weather, weatherStatus) {
  if (weatherStatus === "loading") return "Loading...";
  if (!hasWeatherApiKey()) return "--°";
  if (typeof weather?.temperature === "number") return `${weather.temperature}°F`;
  return "--°";
}

export default function FamilyCalendarWeatherWidget() {
  const savedLocation = readSavedLocation();
  const savedWeather = readSavedWeather();
  const [location, setLocation] = useState(() => savedLocation);
  const [weather, setWeather] = useState(() => (isFreshWeather(savedWeather) ? savedWeather : null));
  const [status, setStatus] = useState(() => (savedLocation ? "granted" : "idle"));
  const [weatherStatus, setWeatherStatus] = useState("idle");
  const [error, setError] = useState("");

  async function loadWeather(nextLocation = location, options = {}) {
    if (!nextLocation?.latitude || !nextLocation?.longitude || !hasWeatherApiKey()) return;

    const cachedWeather = readSavedWeather();
    if (!options.force && isFreshWeather(cachedWeather)) {
      setWeather(cachedWeather);
      return;
    }

    setWeatherStatus("loading");
    try {
      const nextWeather = await getCurrentWeatherByCoordinates(nextLocation.latitude, nextLocation.longitude);
      saveWeather(nextWeather);
      setWeather(nextWeather);
      setWeatherStatus("loaded");
    } catch (weatherError) {
      console.error("Error loading weather", weatherError);
      setWeatherStatus("error");
      setError(weatherError.message || "Unable to load weather.");
    }
  }

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

  useEffect(() => {
    if (location) loadWeather(location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude]);

  const locationText = useMemo(() => {
    if (weather?.city) return `${weather.city}${weather.country ? `, ${weather.country}` : ""}`;
    return permissionLabel(status);
  }, [weather, status]);

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
        loadWeather(nextLocation, { force: true });
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
          title={locationText}
        >
          <MapPin className="h-3.5 w-3.5 text-pink-500" /> {locationText}
        </button>
        <span className="inline-flex items-center gap-1" title={weather?.description || "Weather"}>
          <CloudSun className="h-4 w-4" /> {weatherText(weather, weatherStatus)}
        </span>
      </div>
      {weather?.description && <p className="text-right text-[10px] font-semibold capitalize text-slate-400">{weather.description}</p>}
      {error && <p className="max-w-[280px] text-right text-[10px] font-semibold text-rose-400">{error}</p>}
    </div>
  );
}

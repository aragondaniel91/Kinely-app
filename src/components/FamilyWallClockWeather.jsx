import React, { useEffect, useMemo, useState } from "react";
import { CloudSun, Clock3, MapPin } from "lucide-react";

const WEATHER_CODE = {
  0: { label: "Clear", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Cloudy", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Drizzle", icon: "🌦️" },
  61: { label: "Light rain", icon: "🌧️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  71: { label: "Snow", icon: "🌨️" },
  73: { label: "Snow", icon: "🌨️" },
  75: { label: "Heavy snow", icon: "🌨️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Showers", icon: "🌦️" },
  82: { label: "Heavy showers", icon: "⛈️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
};

const DEFAULT_LAT = Number(import.meta.env.VITE_DEFAULT_WEATHER_LAT || 29.7604);
const DEFAULT_LON = Number(import.meta.env.VITE_DEFAULT_WEATHER_LON || -95.3698);
const DEFAULT_LABEL = import.meta.env.VITE_DEFAULT_WEATHER_LABEL || "Houston";

function getWeatherDescription(code) {
  return WEATHER_CODE[code] || { label: "Weather", icon: "🌤️" };
}

function getPosition() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON, source: DEFAULT_LABEL });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "Current location",
        });
      },
      () => {
        resolve({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON, source: DEFAULT_LABEL });
      },
      { enableHighAccuracy: false, timeout: 4500, maximumAge: 30 * 60 * 1000 }
    );
  });
}

export default function FamilyWallClockWeather() {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState({ loading: true, temp: null, code: null, source: DEFAULT_LABEL });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadWeather() {
      try {
        const position = await getPosition();
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${position.latitude}&longitude=${position.longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
        const response = await fetch(url);
        const data = await response.json();

        if (!active) return;

        setWeather({
          loading: false,
          temp: Math.round(data?.current?.temperature_2m),
          code: data?.current?.weather_code,
          source: position.source,
        });
      } catch (error) {
        if (!active) return;
        setWeather({ loading: false, temp: null, code: null, source: DEFAULT_LABEL });
      }
    }

    loadWeather();
    const weatherTimer = window.setInterval(loadWeather, 20 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(weatherTimer);
    };
  }, []);

  const weatherInfo = getWeatherDescription(weather.code);
  const time = useMemo(
    () => now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    [now]
  );
  const day = useMemo(
    () => now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
    [now]
  );

  return (
    <div className="family-wall-clock-weather pointer-events-none fixed right-[5.25rem] top-5 z-[115] hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur md:flex">
      <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
        <Clock3 className="h-4 w-4 text-blue-600" />
        <div className="leading-tight">
          <p className="text-lg font-black text-slate-950">{time}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{day}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">{weatherInfo.icon}</span>
        <div className="leading-tight">
          <p className="text-lg font-black text-slate-950">
            {weather.loading ? "--" : weather.temp !== null ? `${weather.temp}°` : "--°"}
          </p>
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <MapPin className="h-3 w-3" />
            {weather.temp !== null ? weatherInfo.label : "Weather"}
          </p>
        </div>
      </div>
    </div>
  );
}

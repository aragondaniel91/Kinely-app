const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

export class WeatherServiceError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "WeatherServiceError";
    this.details = details;
  }
}

function normalizeWeatherPayload(payload = {}) {
  const weather = Array.isArray(payload.weather) ? payload.weather[0] : null;

  return {
    temperature: typeof payload.main?.temp === "number" ? Math.round(payload.main.temp) : null,
    feelsLike: typeof payload.main?.feels_like === "number" ? Math.round(payload.main.feels_like) : null,
    condition: weather?.main || "Weather",
    description: weather?.description || "",
    icon: weather?.icon || "",
    city: payload.name || "",
    country: payload.sys?.country || "",
    humidity: payload.main?.humidity ?? null,
    windSpeed: payload.wind?.speed ?? null,
    updatedAt: new Date().toISOString(),
    provider: "openweather",
  };
}

export function hasWeatherApiKey() {
  return Boolean(OPENWEATHER_API_KEY);
}

export async function getCurrentWeatherByCoordinates(latitude, longitude, options = {}) {
  if (!OPENWEATHER_API_KEY) {
    throw new WeatherServiceError("OpenWeather API key is not configured.", {
      missingEnv: "VITE_OPENWEATHER_API_KEY",
    });
  }

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new WeatherServiceError("Valid latitude and longitude are required.");
  }

  const units = options.units || "imperial";
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    units,
    appid: OPENWEATHER_API_KEY,
  });

  const response = await fetch(`${OPENWEATHER_BASE_URL}?${params.toString()}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new WeatherServiceError(payload?.message || "Unable to load weather.", {
      status: response.status,
      payload,
    });
  }

  return normalizeWeatherPayload(payload);
}

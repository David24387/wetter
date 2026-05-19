import React, { useEffect, useMemo, useState } from "react";
import { CloudRain, MapPin, Thermometer, Snowflake, Sun, AlertTriangle, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WerkstattWetterWidget() {
  const [coords, setCoords] = useState(null);
  const [manualCity, setManualCity] = useState("München");
  const [weather, setWeather] = useState(null);
  const [cityName, setCityName] = useState("Dein Standort");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function getWeatherByCoords(latitude, longitude, label = "Dein Standort") {
    setLoading(true);
    setError("");

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,rain,snowfall,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&timezone=auto&forecast_days=3`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Wetterdaten konnten nicht geladen werden.");
      const data = await res.json();
      setWeather(data);
      setCityName(label);
    } catch (err) {
      setError("Wetter konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function getCoordsByCity(city) {
    setLoading(true);
    setError("");

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=de&format=json`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.results?.length) {
        setError("Ort nicht gefunden.");
        setLoading(false);
        return;
      }

      const place = data.results[0];
      setCoords({ latitude: place.latitude, longitude: place.longitude });
      await getWeatherByCoords(place.latitude, place.longitude, `${place.name}${place.admin1 ? `, ${place.admin1}` : ""}`);
    } catch (err) {
      setError("Ort konnte nicht gesucht werden.");
      setLoading(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Dein Browser unterstützt keine Standortfreigabe.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setCoords({ latitude, longitude });
        await getWeatherByCoords(latitude, longitude, "Dein Standort");
      },
      () => {
        setError("Standort wurde nicht freigegeben. Bitte Ort manuell eingeben.");
        setLoading(false);
      }
    );
  }

  useEffect(() => {
    getCoordsByCity(manualCity);
  }, []);

  const recommendation = useMemo(() => {
    if (!weather?.current) return null;

    const temp = weather.current.temperature_2m;
    const rain = weather.current.rain || 0;
    const snow = weather.current.snowfall || 0;
    const wind = weather.current.wind_speed_10m || 0;

    if (snow > 0 || temp <= 3) {
      return {
        title: "Winterreifen empfohlen",
        text: "Kälte oder Schneefall: Winterreifen bieten mehr Grip und Sicherheit.",
        icon: <Snowflake className="h-5 w-5" />,
        tone: "bg-blue-50 border-blue-200",
      };
    }

    if (temp < 7) {
      return {
        title: "Achtung: unter 7°C",
        text: "Bei niedrigen Temperaturen bleiben Winterreifen flexibler als Sommerreifen.",
        icon: <AlertTriangle className="h-5 w-5" />,
        tone: "bg-amber-50 border-amber-200",
      };
    }

    if (rain > 0) {
      return {
        title: "Aquaplaning-Risiko prüfen",
        text: "Bei Regen sind Profiltiefe, Reifendruck und Geschwindigkeit besonders wichtig.",
        icon: <CloudRain className="h-5 w-5" />,
        tone: "bg-sky-50 border-sky-200",
      };
    }

    if (wind > 45) {
      return {
        title: "Windige Bedingungen",
        text: "Bei starkem Wind besonders auf Fahrzeugstabilität und Reifendruck achten.",
        icon: <AlertTriangle className="h-5 w-5" />,
        tone: "bg-orange-50 border-orange-200",
      };
    }

    return {
      title: "Sommerreifen passend",
      text: "Warme, trockene Bedingungen: Sommerreifen bieten gute Stabilität und Performance.",
      icon: <Sun className="h-5 w-5" />,
      tone: "bg-yellow-50 border-yellow-200",
    };
  }, [weather]);

  const current = weather?.current;
  const daily = weather?.daily;

  return (
    <div className="min-h-screen bg-neutral-100 p-6 flex items-center justify-center">
      <Card className="w-full max-w-xl rounded-2xl shadow-lg border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-100 via-white to-blue-100 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Werkstatt-Wetter</h1>
              <p className="text-sm text-neutral-600">Lokale Wetterinfos mit Reifen-Hinweis</p>
            </div>
            <Thermometer className="h-8 w-8 text-neutral-700" />
          </div>
        </div>

        <CardContent className="p-5 space-y-5">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && getCoordsByCity(manualCity)}
              placeholder="Ort eingeben, z. B. Köln"
              className="flex-1 rounded-xl border px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
            />
            <Button onClick={() => getCoordsByCity(manualCity)} disabled={loading} className="rounded-xl">
              Suchen
            </Button>
            <Button onClick={useCurrentLocation} variant="outline" disabled={loading} className="rounded-xl gap-2">
              <Navigation className="h-4 w-4" /> Standort
            </Button>
          </div>

          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          {loading && <div className="text-sm text-neutral-500">Lade Wetterdaten...</div>}

          {current && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white border p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
                  <MapPin className="h-4 w-4" /> {cityName}
                </div>
                <div className="text-5xl font-bold">{Math.round(current.temperature_2m)}°C</div>
                <div className="mt-3 text-sm text-neutral-600">
                  Regen: {current.rain ?? 0} mm · Schnee: {current.snowfall ?? 0} mm
                </div>
                <div className="text-sm text-neutral-600">Wind: {Math.round(current.wind_speed_10m ?? 0)} km/h</div>
              </div>

              {recommendation && (
                <div className={`rounded-2xl border p-4 ${recommendation.tone}`}>
                  <div className="flex items-center gap-2 font-semibold mb-2">
                    {recommendation.icon}
                    {recommendation.title}
                  </div>
                  <p className="text-sm text-neutral-700">{recommendation.text}</p>
                </div>
              )}
            </div>
          )}

          {daily && (
            <div className="rounded-2xl bg-white border overflow-hidden">
              <div className="px-4 py-3 font-semibold">3-Tage-Ausblick</div>
              {daily.time.map((day, index) => (
                <div key={day} className="grid grid-cols-4 px-4 py-3 border-t text-sm items-center">
                  <div className="font-medium">{new Date(day).toLocaleDateString("de-DE", { weekday: "short" })}</div>
                  <div>{Math.round(daily.temperature_2m_min[index])}° / {Math.round(daily.temperature_2m_max[index])}°</div>
                  <div>Regen {daily.precipitation_sum[index]} mm</div>
                  <div>Schnee {daily.snowfall_sum[index]} cm</div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-neutral-500">
            Idee: Dieses Widget kann später automatisch den Standort aus dem Mitarbeiterprofil oder der Filiale laden.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

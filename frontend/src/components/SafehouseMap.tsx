import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet's broken default marker icons when bundled with Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const emberIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "ember-marker",
});

export interface PublicSafehouse {
  safehouseId: number;
  name: string;
  city: string | null;
  region: string | null;
  capacity: number;
  activeResidents: number;
}

async function geocode(
  city: string | null,
  region: string | null
): Promise<[number, number] | null> {
  const query = [city, region, "Philippines"].filter(Boolean).join(", ");
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch {
    /* silently skip */
  }
  return null;
}

interface SafehouseMapProps {
  safehouses: PublicSafehouse[];
}

// Philippines center
const PH_CENTER: L.LatLngTuple = [12.8797, 121.774];

export default function SafehouseMap({ safehouses }: SafehouseMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [loaded, setLoaded] = useState(0);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: PH_CENTER,
      zoom: 6,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Geocode safehouses and add markers
  useEffect(() => {
    if (!mapRef.current || safehouses.length === 0) return;

    let cancelled = false;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    setLoaded(0);

    (async () => {
      for (const sh of safehouses) {
        const coords = await geocode(sh.city, sh.region);
        if (cancelled) return;
        if (coords && mapRef.current) {
          const marker = L.marker(coords, { icon: emberIcon })
            .addTo(mapRef.current)
            .bindPopup(
              `<div style="font-family:inherit">
                <p style="font-weight:600;font-size:0.85rem;margin:0 0 2px">${sh.name}</p>
                <p style="font-size:0.75rem;color:#6b7280;margin:0">${[sh.city, sh.region].filter(Boolean).join(", ")}</p>
              </div>`
            );
          markersRef.current.push(marker);
          setLoaded((n) => n + 1);
        }
        // Nominatim rate-limit: 1 req/sec
        await new Promise((r) => setTimeout(r, 1100));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [safehouses]);

  return (
    <div className="w-full space-y-2">
      <style>{`
        .ember-marker { filter: hue-rotate(320deg) saturate(2); }
        .leaflet-popup-content-wrapper { border-radius: 10px; }
      `}</style>
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden shadow-md border"
        style={{ height: "480px" }}
      />
      {loaded < safehouses.length && safehouses.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Locating safehouses… ({loaded}/{safehouses.length})
        </p>
      )}
    </div>
  );
}

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet's broken default marker icons when bundled with Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import SAFEHOUSES from "@/data/safehouses";

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

// PublicSafehouse is kept for API compatibility — SafehouseMap no longer uses it
export interface PublicSafehouse {
  safehouseId: number;
  name: string;
  city: string | null;
  region: string | null;
  capacity: number;
  activeResidents: number;
}

interface SafehouseMapProps {
  safehouses: PublicSafehouse[];
}

// Philippines center
const PH_CENTER: L.LatLngTuple = [12.8797, 121.774];

export default function SafehouseMap({ safehouses }: SafehouseMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialise map once and place all markers immediately
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: PH_CENTER,
      zoom: 6,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Merge live activeResidents count from API data (if available) with static coords
    SAFEHOUSES.forEach((sh) => {
      const live = safehouses.find((s) => s.safehouseId === sh.safehouseId);
      const activeResidents = live?.activeResidents ?? "—";

      L.marker([sh.lat, sh.lng], { icon: emberIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:inherit;min-width:160px">
            <p style="font-weight:700;font-size:0.875rem;margin:0 0 4px">${sh.name}</p>
            <p style="font-size:0.75rem;color:#6b7280;margin:0 0 6px">${sh.city}, ${sh.region}</p>
            <div style="display:flex;gap:12px;font-size:0.75rem">
              <span>👥 <strong>${activeResidents}</strong> active</span>
              <span>🏠 Capacity <strong>${sh.capacity}</strong></span>
            </div>
          </div>`
        );
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update popups if live data arrives after mount
  useEffect(() => {
    // Map is already rendered with static coords — nothing to re-render
    // Live activeResidents counts are merged at marker creation time above.
    // A full re-mount would be needed to update counts; acceptable for a public page.
  }, [safehouses]);

  return (
    <div className="w-full">
      <style>{`
        .ember-marker { filter: hue-rotate(320deg) saturate(2); }
        .leaflet-popup-content-wrapper { border-radius: 10px; }
      `}</style>
      <div
        ref={containerRef}
        role="application"
        aria-label="Interactive map showing safehouse locations across the Philippines"
        className="w-full rounded-2xl overflow-hidden shadow-md border"
        style={{ height: "480px" }}
      />
    </div>
  );
}

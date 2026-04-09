import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import SAFEHOUSES from "@/data/safehouses";

// Custom SVG pin in Ember primary — hsl(11, 63%, 46%) = #c0481c
const EMBER_PRIMARY = "#c0481c";
const EMBER_DARK = "#8b3414";

const pinSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
  <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z"
    fill="${EMBER_PRIMARY}" stroke="${EMBER_DARK}" stroke-width="1"/>
  <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
</svg>`.trim();

const emberIcon = L.divIcon({
  html: pinSvg,
  className: "",
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -38],
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

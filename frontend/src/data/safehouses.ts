// Hardcoded safehouse locations — coordinates pre-resolved so the map renders
// instantly without hitting Nominatim (which rate-limits and blocks).
// Source: lighthouse_csv_v7 seed data + known Philippine city coordinates.

export interface SafehouseLocation {
  safehouseId: number;
  name: string;
  city: string;
  region: string;
  capacity: number;
  lat: number;
  lng: number;
}

const SAFEHOUSES: SafehouseLocation[] = [
  {
    safehouseId: 1,
    name: "Lighthouse Safehouse 1",
    city: "Quezon City",
    region: "Luzon",
    capacity: 8,
    lat: 14.676,
    lng: 121.0437,
  },
  {
    safehouseId: 2,
    name: "Lighthouse Safehouse 2",
    city: "Cebu City",
    region: "Visayas",
    capacity: 10,
    lat: 10.3157,
    lng: 123.8854,
  },
  {
    safehouseId: 3,
    name: "Lighthouse Safehouse 3",
    city: "Davao City",
    region: "Mindanao",
    capacity: 9,
    lat: 7.1907,
    lng: 125.4553,
  },
  {
    safehouseId: 4,
    name: "Lighthouse Safehouse 4",
    city: "Iloilo City",
    region: "Visayas",
    capacity: 12,
    lat: 10.7202,
    lng: 122.5621,
  },
  {
    safehouseId: 5,
    name: "Lighthouse Safehouse 5",
    city: "Baguio City",
    region: "Luzon",
    capacity: 11,
    lat: 16.4023,
    lng: 120.596,
  },
  {
    safehouseId: 6,
    name: "Lighthouse Safehouse 6",
    city: "Cagayan de Oro",
    region: "Mindanao",
    capacity: 8,
    lat: 8.4542,
    lng: 124.6319,
  },
  {
    safehouseId: 7,
    name: "Lighthouse Safehouse 7",
    city: "Bacolod",
    region: "Visayas",
    capacity: 12,
    lat: 10.6713,
    lng: 122.9511,
  },
  {
    safehouseId: 8,
    name: "Lighthouse Safehouse 8",
    city: "Tacloban",
    region: "Visayas",
    capacity: 9,
    lat: 11.2543,
    lng: 125.0,
  },
  {
    safehouseId: 9,
    name: "Lighthouse Safehouse 9",
    city: "General Santos",
    region: "Mindanao",
    capacity: 6,
    lat: 6.1164,
    lng: 125.1716,
  },
];

export default SAFEHOUSES;

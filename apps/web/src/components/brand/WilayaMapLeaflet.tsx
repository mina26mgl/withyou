"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Leaflet + webpack issue)
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [20, 32],
  iconAnchor: [10, 32],
  popupAnchor: [0, -32],
  shadowSize: [32, 32],
});

const WILAYA_COORDS: Record<string, [number, number]> = {
  "Adrar": [27.8742, -0.2939],
  "Chlef": [36.1650, 1.3300],
  "Laghouat": [33.8003, 2.8656],
  "Oum El Bouaghi": [35.8731, 7.1135],
  "Batna": [35.5550, 6.1740],
  "Béjaïa": [36.7514, 5.0564],
  "Biskra": [34.8500, 5.7333],
  "Béchar": [31.6238, -2.2150],
  "Blida": [36.4700, 2.8300],
  "Bouira": [36.3800, 3.9000],
  "Tamanrasset": [22.7903, 5.5228],
  "Tébessa": [35.4042, 8.1200],
  "Tlemcen": [34.8828, -1.3167],
  "Tiaret": [35.3706, 1.3217],
  "Tizi Ouzou": [36.7167, 4.0500],
  "Alger": [36.7538, 3.0588],
  "Djelfa": [34.6700, 3.2600],
  "Jijel": [36.8200, 5.7680],
  "Sétif": [36.1898, 5.4108],
  "Saïda": [34.8306, 0.1514],
  "Skikda": [36.8761, 6.9067],
  "Sidi Bel Abbès": [35.1897, -0.6328],
  "Annaba": [36.9000, 7.7667],
  "Guelma": [36.4636, 7.4283],
  "Constantine": [36.3650, 6.6147],
  "Médéa": [36.2675, 2.7540],
  "Mostaganem": [35.9311, 0.0892],
  "M'Sila": [35.7022, 4.5400],
  "Mascara": [35.3961, 0.1425],
  "Ouargla": [31.9539, 5.3250],
  "Oran": [35.6969, -0.6331],
  "El Bayadh": [33.6833, 1.0167],
  "Illizi": [26.5000, 8.4833],
  "Bordj Bou Arreridj": [36.0731, 4.7625],
  "Boumerdès": [36.7639, 3.4769],
  "El Tarf": [36.7672, 8.3131],
  "Tindouf": [27.6725, -8.1453],
  "Tissemsilt": [35.6067, 1.8117],
  "El Oued": [33.3682, 6.8571],
  "Khenchela": [35.4286, 7.1456],
  "Souk Ahras": [36.2864, 7.9511],
  "Tipaza": [36.5892, 2.4472],
  "Mila": [36.4503, 6.2633],
  "Aïn Defla": [36.2642, 1.9658],
  "Naâma": [33.2672, -0.3072],
  "Aïn Témouchent": [35.2975, -1.1392],
  "Ghardaïa": [32.4908, 3.6731],
  "Relizane": [35.7381, 0.5569],
};

/** Anciennes pages sans coordonnées : on retrouve la wilaya d'après le texte saisi. */
function wilayaCoords(wilaya: string): [number, number] | null {
  const lower = wilaya.toLowerCase().trim();
  if (!lower) return null;
  for (const key of Object.keys(WILAYA_COORDS)) {
    if (key.toLowerCase() === lower) return WILAYA_COORDS[key];
  }
  for (const key of Object.keys(WILAYA_COORDS)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return WILAYA_COORDS[key];
  }
  return null;
}

/** Vue d'ensemble de l'Algérie du Nord quand le lieu est inconnu (pas de faux repère). */
const ALGERIA_CENTER: [number, number] = [34.5, 3.2];

export default function WilayaMapLeaflet({
  wilaya,
  lat,
  lng,
  mode = "light",
}: {
  wilaya: string;
  lat?: number | null;
  lng?: number | null;
  mode?: "light" | "dark";
}) {
  const exact: [number, number] | null = lat != null && lng != null ? [lat, lng] : wilayaCoords(wilaya);
  const coords = exact ?? ALGERIA_CENTER;

  useEffect(() => {
    // Remove duplicate Leaflet CSS if SSR added it
    const links = document.querySelectorAll('link[href*="leaflet"]');
    if (links.length > 1) links[0].remove();
  }, []);

  return (
    <MapContainer
      // center n'est lu qu'au montage : la clé recrée la carte quand le lieu change.
      key={coords.join(",")}
      center={coords}
      zoom={exact ? 10 : 5}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      zoomControl={false}
      attributionControl={false}
      style={{ width: "100%", height: "100%", borderRadius: "inherit" }}
    >
      <TileLayer
        // CARTO exige désormais une clé (tuiles barrées « API KEY REQUIRED ») : Stadia pour les deux modes.
        url={`https://tiles.stadiamaps.com/tiles/${mode === "dark" ? "alidade_smooth_dark" : "alidade_smooth"}/{z}/{x}/{y}{r}.png?api_key=${process.env.NEXT_PUBLIC_STADIA_API_KEY}`}
      />
      {exact && <Marker position={exact} icon={markerIcon} />}
    </MapContainer>
  );
}

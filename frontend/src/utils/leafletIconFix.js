// src/utils/leafletIconFix.js
//
// react-leaflet's default marker icon references relative image paths
// that don't survive bundling (Vite/webpack rewrite asset URLs). Without
// this fix, every default <Marker> renders as a broken image icon.
// Import this once, anywhere before your first <MapContainer> renders
// (e.g. at the top of each page that uses a map).

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import icon2x from 'leaflet/dist/images/marker-icon-2x.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: icon2x,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

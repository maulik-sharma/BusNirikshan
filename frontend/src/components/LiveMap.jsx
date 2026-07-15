import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { BusMarker } from './BusMarker';
import { StopMarker } from './StopMarker';

// Helper component to programmatically pan/zoom map on coordinate selections
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), { animate: true, duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
};

export const LiveMap = ({ 
  buses = [], 
  stops = [], 
  center = [20.5937, 78.9629], // Center of India
  zoom = 5, 
  onMapClick 
}) => {
  const mapRef = useRef(null);

  // Bind clicks if parent defines a handler
  const MapClickHandler = () => {
    const map = useMap();
    useEffect(() => {
      if (!onMapClick) return;
      const onClick = (e) => {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      };
      map.on('click', onClick);
      return () => {
        map.off('click', onClick);
      };
    }, [map]);
    return null;
  };

  return (
    <div className="w-full h-full relative overflow-hidden rounded-[2rem] border border-white/5 shadow-2xl dark-map">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        zoomControl={true}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[400px] z-10"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render controller to change zoom/center programmatically */}
        <MapController center={center} zoom={zoom} />
        
        {/* Map Click Listener */}
        <MapClickHandler />

        {/* Bus Markers */}
        {buses.map((bus) => (
          <BusMarker key={bus._id} bus={bus} />
        ))}

        {/* Stop Markers */}
        {stops.map((stop) => (
          <StopMarker key={stop._id} stop={stop} />
        ))}
      </MapContainer>
    </div>
  );
};
export default LiveMap;

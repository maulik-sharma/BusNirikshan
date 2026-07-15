import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Bus, NavigationArrow, Calendar } from '@phosphor-icons/react';

// Custom rotatable SVG bus icon builder
const createBusIcon = (heading, isActive) => {
  const iconSize = 40;
  const activeColor = '#10b981'; // Emerald
  const inactiveColor = '#6b7280'; // Gray
  const color = isActive ? activeColor : inactiveColor;
  
  const html = `
    <div style="
      width: ${iconSize}px;
      height: ${iconSize}px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <!-- Glow ring if active -->
      ${isActive ? `
        <div style="
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.15);
          box-shadow: 0 0 12px ${activeColor};
          animation: pulse 2s infinite;
        "></div>
      ` : ''}

      <!-- Center Icon Container -->
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #0d111b;
        border: 2px solid ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
        position: relative;
        z-index: 2;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="${color}" style="width: 16px; height: 16px;">
          <path d="M224,96V80a24,24,0,0,0-24-24H56A24,24,0,0,0,32,80V96H24a8,8,0,0,0,0,16h8v48H24a8,8,0,0,0,0,16h8v16a24,24,0,0,0,24,24H72a16,16,0,0,0,16-16V184h80v12a16,16,0,0,0,16,16h16a24,24,0,0,0,24-24V176h8a8,8,0,0,0,0-16H224V112h8a8,8,0,0,0,0-16ZM48,80a8,8,0,0,1,8-8H199.93a8,8,0,0,1,8,7.31L208,96H48ZM72,200H56a8,8,0,0,1-8-8V176H72Zm136-8a8,8,0,0,1-8,8H184V176h24ZM208,160H48V112H208Zm-120-28a12,12,0,1,1-12-12A12,12,0,0,1,88,132Zm92,12a12,12,0,1,1,12-12A12,12,0,0,1,180,144Z" />
        </svg>
      </div>

      <!-- Direction indicator pointer arrow -->
      <div style="
        position: absolute;
        width: 10px;
        height: 10px;
        top: -2px;
        left: calc(50% - 5px);
        transform: rotate(${heading}deg);
        transform-origin: 5px 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="${color}" style="width: 10px; height: 10px;">
          <path d="M237.28,111.4l-96-80a16,16,0,0,0-20.56,0l-96,80a16,16,0,0,0,4.8,27.27l80,24V224a16,16,0,0,0,32,0V162.67l80-24a16,16,0,0,0,4.76-27.27Z" />
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-bus-icon',
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2]
  });
};

export const BusMarker = ({ bus }) => {
  const { lastKnownLocation, routeName, registrationNumber, isActive, speed_kmh } = bus;

  if (!lastKnownLocation || !lastKnownLocation.coordinates || lastKnownLocation.coordinates.length < 2) {
    return null;
  }

  // coordinates in MongoDB is [longitude, latitude], Leaflet expects [latitude, longitude]
  const position = [lastKnownLocation.coordinates[1], lastKnownLocation.coordinates[0]];
  const heading = lastKnownLocation.heading_deg || 0;
  const speed = lastKnownLocation.speed_kmh || speed_kmh || 0;
  
  const icon = createBusIcon(heading, isActive);

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div className="p-1 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1.5">
            <span className="font-semibold text-white tracking-wide text-xs">{routeName}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
              isActive ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-500/15 text-slate-400'
            }`}>
              {isActive ? 'ON SHIFT' : 'OFF SHIFT'}
            </span>
          </div>
          
          {/* Details */}
          <div className="space-y-1 text-xs text-[#8e9bb0]">
            <p className="flex justify-between">
              <span>Plate:</span>
              <strong className="text-white font-mono">{registrationNumber}</strong>
            </p>
            <p className="flex justify-between">
              <span>Current Speed:</span>
              <strong className="text-white font-mono">{speed} km/h</strong>
            </p>
            <p className="flex justify-between">
              <span>Heading:</span>
              <strong className="text-white font-mono">{heading}°</strong>
            </p>
            {lastKnownLocation.recordedAt && (
              <p className="flex justify-between text-[10px] pt-1 text-slate-500 border-t border-white/5 mt-1.5">
                <span className="flex items-center gap-1"><Calendar size={10} /> Updated:</span>
                <span>{new Date(lastKnownLocation.recordedAt).toLocaleTimeString()}</span>
              </p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
};
export default BusMarker;

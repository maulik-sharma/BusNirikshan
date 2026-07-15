import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import L from 'leaflet';

const createStopIcon = (isActive) => {
  const iconSize = 36;
  const color = isActive ? '#f59e0b' : '#6b7280'; // Amber vs Gray
  
  const html = `
    <div style="
      width: ${iconSize}px;
      height: ${iconSize}px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #0d111b;
        border: 3px solid ${color};
        box-shadow: 
          0 0 0 3px rgba(245, 158, 11, 0.1),
          0 4px 10px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease;
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-stop-icon',
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2]
  });
};

export const StopMarker = ({ stop }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { _id, name, city, state, location, isActive, rtc } = stop;

  if (!location || !location.coordinates || location.coordinates.length < 2) {
    return null;
  }

  // MongoDB is [lng, lat], Leaflet is [lat, lng]
  const position = [location.coordinates[1], location.coordinates[0]];
  const icon = createStopIcon(isActive);

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div className="p-1 space-y-2 text-slate-300">
          <div className="border-b border-white/10 pb-1">
            <h4 className="font-bold text-white text-sm leading-tight">{name}</h4>
            <span className="text-[10px] text-[#8e9bb0] uppercase font-medium">{city}, {state}</span>
          </div>

          <div className="space-y-1 text-xs">
            {rtc && rtc.length > 0 && (
              <p className="flex flex-wrap gap-1 items-center">
                <span className="text-[#8e9bb0]">RTCs:</span>
                {rtc.map((r) => (
                  <span key={r} className="bg-white/5 border border-white/10 text-[9px] px-1 py-0.2 rounded font-mono">
                    {r}
                  </span>
                ))}
              </p>
            )}
          </div>

          <button 
            onClick={() => navigate(user?.role === 'admin' ? `/admin/stops/${_id}` : `/stops/${_id}`)}
            className="w-full mt-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black font-semibold rounded-lg text-[11px] transition-all text-center"
          >
            Open ETA Board
          </button>
        </div>
      </Popup>
    </Marker>
  );
};
export default StopMarker;

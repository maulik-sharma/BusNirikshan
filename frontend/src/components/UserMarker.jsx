import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const createUserIcon = () => {
  const iconSize = 44; // Slightly larger to stand out
  
  const html = `
    <div style="
      width: ${iconSize}px;
      height: ${iconSize}px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    ">
      <!-- Radar pulse effect -->
      <div style="
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.2);
        animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      
      <!-- Core marker -->
      <div style="
        position: relative;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #3b82f6; /* Blue for user */
        border: 3px solid #ffffff;
        box-shadow: 
          0 0 0 3px rgba(59, 130, 246, 0.3),
          0 4px 10px rgba(0, 0, 0, 0.3);
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-user-icon',
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2]
  });
};

export const UserMarker = ({ position }) => {
  if (!position || position.length !== 2) return null;

  return (
    <Marker position={position} icon={createUserIcon()}>
      <Popup>
        <div className="p-1 text-center">
          <h4 className="font-bold text-white text-sm">You are here</h4>
          <span className="text-[10px] text-[#8e9bb0] uppercase">Current Location</span>
        </div>
      </Popup>
    </Marker>
  );
};
export default UserMarker;

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useGeolocation } from '../../hooks/useGeolocation';
import { LiveMap } from '../../components/LiveMap';
import { MapPin, MagnifyingGlass, Warning, Compass, ArrowClockwise } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
  const [buses, setBuses] = useState([]);
  const [stops, setStops] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [isLoadingStops, setIsLoadingStops] = useState(false);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default to center of India
  const [mapZoom, setMapZoom] = useState(5);

  const geo = useGeolocation();
  const { locations, subscribe } = useWebSocket();

  // 1. Fetch live active buses on mount — guarded for React Strict Mode double-mount
  useEffect(() => {
    let ignore = false;

    const fetchLiveBuses = async () => {
      try {
        const response = await apiFetch('/api/locations/live?limit=100');
        const data = await response.json();
        if (!ignore && response.ok) {
          const busList = data.buses || [];
          setBuses(busList);

          const activeIds = busList.map(b => b._id);
          if (activeIds.length > 0) subscribe(activeIds);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching live buses:', err);
          setError('Failed to load active buses.');
        }
      }
    };

    fetchLiveBuses();
    return () => { ignore = true; };
  }, [subscribe]);

  // 2. Fetch stops: either nearby stops (if GPS is active) or general list
  const fetchStops = async () => {
    setIsLoadingStops(true);
    try {
      let url = '/api/stops?limit=15';
      if (geo.coordinates) {
        const [lng, lat] = geo.coordinates;
        url = `/api/stops/nearby?longitude=${lng}&latitude=${lat}&radius=10000`;
        setMapCenter([lat, lng]);
        setMapZoom(12);
      }
      const response = await apiFetch(url);
      const data = await response.json();
      if (response.ok) setStops(data.stops || []);
    } catch (err) {
      console.error('Error loading stops:', err);
    } finally {
      setIsLoadingStops(false);
    }
  };

  useEffect(() => { fetchStops(); }, [geo.coordinates]);

  // 3. Merge WebSocket updates into buses list
  const mergedBuses = buses
    .filter((bus) => locations[bus._id]?.isActive !== false)
    .map((bus) => {
      const wsUpdate = locations[bus._id];
      if (wsUpdate) {
        return {
          ...bus,
          lastKnownLocation: {
            ...bus.lastKnownLocation,
            coordinates: [wsUpdate.lng, wsUpdate.lat],
            speed_kmh: wsUpdate.speed_kmh,
            heading_deg: wsUpdate.heading_deg,
            recordedAt: wsUpdate.timestamp
          }
        };
      }
      return bus;
    });

  // Filter stops by query string
  const filteredStops = stops.filter(stop => 
    stop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stop.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full min-h-[calc(100dvh-7.5rem)] animate-fade-in-up">
      {/* Side Control Panel (Bento-style list) */}
      <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0 order-2 lg:order-1">
        {/* Search & Location Info Card */}
        <div className="liquid-glass p-6 rounded-[2rem] space-y-4">
          <h3 className="text-white font-bold tracking-tight text-base">Find Bus Stops</h3>
          
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#8e9bb0]">
              <MagnifyingGlass size={16} />
            </span>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stop or city..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>

          {geo.error ? (
            <div className="flex items-center gap-2 text-xs text-amber-500/80 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
              <Compass size={14} />
              <span>Using default view. Grant GPS access for nearby stops.</span>
            </div>
          ) : geo.coordinates ? (
            <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 font-mono">
              <Compass size={14} className="animate-spin" />
              <span>GPS Lock: {geo.coordinates[1].toFixed(4)}, {geo.coordinates[0].toFixed(4)}</span>
            </div>
          ) : (
            <div className="text-xs text-[#8e9bb0] animate-pulse">Locking browser GPS...</div>
          )}
        </div>

        {/* Stops List Card */}
        <div className="liquid-glass p-6 rounded-[2rem] flex-1 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-bold text-sm">
              {geo.coordinates ? 'Stops Near You' : 'Available Stops'}
            </h4>
            <button 
              onClick={fetchStops}
              className="p-1 rounded text-[#8e9bb0] hover:text-white hover:bg-white/5 active:scale-95 transition-all"
            >
              <ArrowClockwise size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[400px] lg:max-h-[calc(100vh-25rem)]">
            {isLoadingStops ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 border border-white/5 animate-pulse" />
              ))
            ) : filteredStops.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#8e9bb0]">
                No bus stops found.
              </div>
            ) : (
              filteredStops.map((stop) => (
                <Link
                  key={stop._id}
                  to={`/stops/${stop._id}`}
                  className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 hover:border-emerald-500/20 rounded-xl group transition-all duration-300"
                >
                  <div className="overflow-hidden pr-2">
                    <h5 className="font-semibold text-white text-xs truncate group-hover:text-emerald-500 transition-colors">
                      {stop.name}
                    </h5>
                    <p className="text-[10px] text-[#8e9bb0] font-mono mt-0.5">
                      {stop.city}, {stop.state}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 text-[10px] text-[#8e9bb0]">
                    <MapPin size={12} className="text-[#8e9bb0] group-hover:text-emerald-500" />
                    <span className="font-mono">
                      {geo.coordinates ? 'Nearby' : 'Details'}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Map Box */}
      <div className="flex-grow order-1 lg:order-2 min-h-[400px] lg:min-h-0 relative">
        {error && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl backdrop-blur-md">
            <Warning size={14} />
            <span>{error}</span>
          </div>
        )}
        
        {/* Dynamic Leaflet Map Component */}
        <LiveMap 
          buses={mergedBuses} 
          stops={stops} 
          userLocation={geo.coordinates ? [geo.coordinates[1], geo.coordinates[0]] : null}
          center={mapCenter} 
          zoom={mapZoom} 
        />
      </div>
    </div>
  );
};
export default DashboardPage;

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useGeolocation } from '../../hooks/useGeolocation';
import { LiveMap } from '../../components/LiveMap';
import { 
  ArrowLeft, 
  Bus, 
  Clock, 
  MapPin, 
  Bell, 
  BellRinging, 
  Warning, 
  ArrowRight,
  Info
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

export const StopDetailPage = () => {
  const { stopId } = useParams();
  const [stop, setStop] = useState(null);
  const [buses, setBuses] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [subscribedRoutes, setSubscribedRoutes] = useState(new Set()); // set of routeIds user subscribed to at this stop

  const { locations, subscribe, unsubscribe } = useWebSocket();
  const geo = useGeolocation();

  // 1. Fetch stop metadata and approaching buses
  const loadData = async () => {
    try {
      const stopRes = await apiFetch(`/api/stops/${stopId}`);
      const stopData = await stopRes.json();
      if (!stopRes.ok) throw new Error(stopData.message || 'Failed to fetch stop metadata');
      setStop(stopData.stop);

      const busesRes = await apiFetch(`/api/stops/${stopId}/buses`);
      const busesData = await busesRes.json();
      if (busesRes.ok) {
        setBuses(busesData.buses || []);
        
        // Subscribe to live locations for all approaching buses
        const ids = (busesData.buses || []).map(b => b._id);
        subscribe(ids);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error loading stop data.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch user's active notifications to check subscriptions at this stop
  const loadSubscriptions = async () => {
    try {
      const res = await apiFetch('/api/notifications');
      const data = await res.json();
      if (res.ok && data.subscriptions) {
        const subsAtStop = data.subscriptions
          .filter(sub => sub.stopId?._id === stopId)
          .map(sub => sub.routeId?._id);
        setSubscribedRoutes(new Set(subsAtStop));
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    }
  };

  useEffect(() => {
    if (!stopId) {
      setIsLoading(false);
      return;
    }
    loadData();
    loadSubscriptions();
  }, [stopId, subscribe]);

  // Clean up WS subscriptions on unmount
  useEffect(() => {
    return () => {
      if (buses.length > 0) {
        unsubscribe(buses.map(b => b._id));
      }
    };
  }, [buses, unsubscribe]);

  // 3. Trigger alert subscription toggles
  const toggleAlert = async (routeId) => {
    const isSubscribed = subscribedRoutes.has(routeId);
    try {
      if (isSubscribed) {
        // Unsubscribe
        const response = await apiFetch('/api/notifications/subscribe', {
          method: 'DELETE',
          body: JSON.stringify({ stopId, routeId }),
        });
        if (response.ok) {
          setSubscribedRoutes(prev => {
            const next = new Set(prev);
            next.delete(routeId);
            return next;
          });
        }
      } else {
        // Subscribe (default to 5 minutes threshold)
        const response = await apiFetch('/api/notifications/subscribe', {
          method: 'POST',
          body: JSON.stringify({ stopId, routeId, thresholdMinutes: 5 }),
        });
        if (response.ok) {
          setSubscribedRoutes(prev => {
            const next = new Set(prev);
            next.add(routeId);
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Alert toggle failed:', err);
    }
  };

  // 4. Merge live WS coordinates, speed and heading -> recompute distance & ETA locally
  // using Haversine formula
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const processedBuses = buses
    .filter((bus) => locations[bus._id]?.isActive !== false)
    .map((bus) => {
    const wsUpdate = locations[bus._id];
    let coords = bus.lastKnownLocation?.coordinates;
    let speed = bus.speed_kmh || 40;

    if (wsUpdate) {
      coords = [wsUpdate.lng, wsUpdate.lat];
      speed = wsUpdate.speed_kmh || speed;
    }

    if (stop && stop.location && coords) {
      const distanceKm = getDistance(
        coords[1], // bus lat
        coords[0], // bus lng
        stop.location.coordinates[1], // stop lat
        stop.location.coordinates[0]  // stop lng
      );

      const speedKmh = speed > 0 ? speed : 40;
      const etaMinutes = Math.round((distanceKm / speedKmh) * 60);

      return {
        ...bus,
        lastKnownLocation: {
          ...bus.lastKnownLocation,
          coordinates: coords,
          speed_kmh: speedKmh,
          heading_deg: wsUpdate?.heading_deg || bus.lastKnownLocation?.heading_deg || 0,
        },
        distance_km: parseFloat(distanceKm.toFixed(2)),
        eta_minutes: etaMinutes
      };
    }

    return bus;
  });

  // Sort buses by ETA minutes ascending
  const sortedBuses = [...processedBuses].sort((a, b) => (a.eta_minutes || 0) - (b.eta_minutes || 0));

  if (!stopId) {
    return (
      <div className="flex-grow flex items-center justify-center p-8 animate-fade-in-up h-[calc(100vh-100px)]">
        <div className="max-w-md w-full liquid-glass p-8 rounded-[2rem] border border-white/5 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 text-emerald-500">
            <MapPin size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Select a Bus Stop</h2>
          <p className="text-sm text-[#8e9bb0] mb-6">
            Please select a bus stop from the Live Map or the Nearby Stops list on the dashboard to view its live ETA board.
          </p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-black font-semibold rounded-xl text-sm transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)]">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !stop) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center gap-4 text-center">
        <Warning size={32} className="text-amber-500" />
        <p className="text-red-400 font-semibold">{error || 'Stop not found.'}</p>
        <Link to="/dashboard" className="px-4 py-2 bg-emerald-500 text-black font-semibold rounded-xl text-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const stopCoords = [stop.location.coordinates[1], stop.location.coordinates[0]];

  return (
    <div className="flex-grow flex flex-col gap-6 animate-fade-in-up">
      {/* Header breadcrumb bar */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="p-2 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl text-[#8e9bb0] hover:text-white transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-0.5">{stop.name}</h1>
          <p className="text-xs text-[#8e9bb0] font-mono">{stop.city}, {stop.state}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        {/* Approaching Board panel (Bento 2.0 list with spring reorder dynamics) */}
        <div className="lg:col-span-1 flex flex-col gap-6 order-2 lg:order-1">
          <div className="liquid-glass p-6 rounded-[2rem] flex-grow flex flex-col min-h-[300px]">
            <h3 className="text-white font-bold tracking-tight text-base mb-4 flex items-center gap-2">
              <Clock size={18} className="text-emerald-500" />
              <span>Approaching Buses</span>
            </h3>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {sortedBuses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-[#8e9bb0] gap-2">
                  <Info size={24} />
                  <p className="text-xs">No active buses currently approaching this stop.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {sortedBuses.map((bus) => {
                    const isAlertSubbed = subscribedRoutes.has(bus.routeId);
                    return (
                      <motion.div
                        key={bus._id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-emerald-500/20 transition-all duration-300"
                      >
                        <div className="space-y-1">
                          <span className="font-semibold text-white text-xs block">{bus.routeName}</span>
                          <span className="text-[10px] text-[#8e9bb0] font-mono block">
                            Plate: {bus.registrationNumber} • {bus.distance_km} km away
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Alert Toggle Bell */}
                          <button
                            onClick={() => toggleAlert(bus.routeId)}
                            title={isAlertSubbed ? 'Unsubscribe from alerts' : 'Subscribe to ETA alerts'}
                            className={`p-2 rounded-lg border active:scale-95 transition-all ${
                              isAlertSubbed 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                : 'bg-white/5 border-white/5 text-[#8e9bb0] hover:text-white'
                            }`}
                          >
                            {isAlertSubbed ? <BellRinging size={14} weight="fill" /> : <Bell size={14} />}
                          </button>
                          
                          {/* ETA display in font-mono cockpit style */}
                          <div className="text-right">
                            <span className="text-emerald-500 font-mono text-base font-bold">
                              {bus.eta_minutes}
                            </span>
                            <span className="text-[9px] text-[#8e9bb0] uppercase tracking-wider block font-mono">
                              mins
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* Map Panel for Visual Board */}
        <div className="lg:col-span-2 order-1 lg:order-2 min-h-[400px] lg:min-h-0 relative">
          <LiveMap
            buses={processedBuses}
            stops={[stop]}
            userLocation={geo.coordinates ? [geo.coordinates[1], geo.coordinates[0]] : null}
            center={stopCoords}
            zoom={14}
          />
        </div>
      </div>
    </div>
  );
};
export default StopDetailPage;

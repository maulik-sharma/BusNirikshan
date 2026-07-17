import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../api/client';
import { useGeolocation } from '../../hooks/useGeolocation';
import { LiveMap } from '../../components/LiveMap';
import { SteeringWheelIcon, MapPinIcon, ClockIcon, SpeedometerIcon, CompassIcon, WarningIcon, ShieldCheckIcon } from '@phosphor-icons/react';

export const DashboardPage = () => {
  const [driver, setDriver] = useState(null);
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState('');
  const [isOnShift, setIsOnShift] = useState(false);
  const [activeShiftInfo, setActiveShiftInfo] = useState(null);
  
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const geo = useGeolocation();
  const locationIntervalRef = useRef(null);

  // Map State & Initial GPS Lock
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom] = useState(5);
  const hasLockedGPS = useRef(false);

  useEffect(() => {
    if (geo.coordinates && !hasLockedGPS.current) {
      setMapCenter([geo.coordinates[1], geo.coordinates[0]]);
      setMapZoom(15);
      hasLockedGPS.current = true;
    }
  }, [geo.coordinates]);

  // 1. Fetch current driver profile details
  const fetchDriverProfile = async () => {
    try {
      const response = await apiFetch('/api/drivers/me');
      const data = await response.json();
      if (response.ok && data.driver) {
        setDriver(data.driver);
        setIsOnShift(data.driver.isOnShift);
        
        if (data.driver.isOnShift && data.driver.assignedBusId) {
          setActiveShiftInfo({
            busId: data.driver.assignedBusId._id,
            registrationNumber: data.driver.assignedBusId.registrationNumber,
            routeName: data.driver.assignedBusId.routeName,
            startedAt: data.driver.shiftStartedAt
          });
        }
      } else {
        setError('Driver profile not registered. Please contact an administrator.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load driver profile.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch buses for dropdown selection
  const fetchBuses = async () => {
    try {
      const response = await apiFetch('/api/buses?limit=100');
      const data = await response.json();
      if (response.ok) {
        setBuses(data.buses || []);
      }
    } catch (err) {
      console.error('Error fetching buses:', err);
    }
  };

  useEffect(() => {
    fetchDriverProfile();
    fetchBuses();
  }, []);

  // 3. Coordinate updates watch loop (Every 30 seconds when On Shift)
  useEffect(() => {
    if (isOnShift && activeShiftInfo && geo.coordinates) {
      // Trigger instant update on shift start
      sendGPSUpdate();

      // Setup 30 seconds interval watch
      locationIntervalRef.current = setInterval(() => {
        sendGPSUpdate();
      }, 30000);
    } else {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    }

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [isOnShift, activeShiftInfo, geo.coordinates]);

  const sendGPSUpdate = async () => {
    if (!geo.coordinates) return;

    try {
      const [lng, lat] = geo.coordinates;
      const response = await apiFetch('/api/locations', {
        method: 'POST',
        body: JSON.stringify({
          lat,
          lng,
          speed_kmh: geo.speed_kmh || 0,
          heading_deg: geo.heading_deg || 0,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setStatusMsg(`Last GPS Ping: ${new Date().toLocaleTimeString()} (Speed: ${geo.speed_kmh} km/h)`);
      } else {
        const data = await response.json();
        console.warn('GPS Ping rejected by API:', data.message);
      }
    } catch (err) {
      console.error('Error sending GPS update:', err);
    }
  };

  // 4. Start Driver Shift
  const handleStartShift = async (e) => {
    e.preventDefault();
    if (!selectedBusId || !driver) return;

    setError('');
    try {
      const response = await apiFetch(`/api/drivers/${driver._id}/shift/start`, {
        method: 'POST',
        body: JSON.stringify({ busId: selectedBusId })
      });
      const data = await response.json();

      if (response.ok) {
        setIsOnShift(true);
        const selectedBus = buses.find(b => b._id === selectedBusId);
        setActiveShiftInfo({
          busId: selectedBusId,
          registrationNumber: selectedBus?.registrationNumber || 'Selected Bus',
          routeName: selectedBus?.routeName || 'Assigned Route',
          startedAt: data.startedAt || new Date().toISOString()
        });
        setStatusMsg('Shift started successfully. Location tracking active.');
      } else {
        setError(data.message || 'Failed to start shift.');
      }
    } catch (err) {
      console.error(err);
      setError('Server error starting shift.');
    }
  };

  // 5. End Driver Shift
  const handleEndShift = async () => {
    if (!driver) return;

    setError('');
    try {
      const response = await apiFetch(`/api/drivers/${driver._id}/shift/end`, {
        method: 'POST'
      });
      const data = await response.json();

      if (response.ok) {
        setIsOnShift(false);
        setActiveShiftInfo(null);
        setSelectedBusId('');
        setStatusMsg('Shift ended. GPS tracking disabled.');
      } else {
        setError(data.message || 'Failed to end shift.');
      }
    } catch (err) {
      console.error(err);
      setError('Server error ending shift.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="text-[#8e9bb0] font-mono text-sm tracking-wider animate-pulse">
          LOADING SHIFT CONTROLLER...
        </div>
      </div>
    );
  }

  if (error && !driver) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center gap-4 text-center">
        <WarningIcon size={32} className="text-red-400" />
        <p className="text-red-400 font-semibold max-w-sm">{error}</p>
      </div>
    );
  }

  // Map State & Initial GPS Lock moved to top level

  // Define dynamic display variables for map plotting
  const busMock = activeShiftInfo && geo.coordinates ? [{
    _id: activeShiftInfo.busId,
    routeName: activeShiftInfo.routeName,
    registrationNumber: activeShiftInfo.registrationNumber,
    isActive: true,
    lastKnownLocation: {
      coordinates: geo.coordinates,
      heading_deg: geo.heading_deg,
      speed_kmh: geo.speed_kmh,
      recordedAt: new Date().toISOString()
    }
  }] : [];

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full min-h-[calc(100dvh-7.5rem)] animate-fade-in-up">
      {/* Sidebar shift controller card */}
      <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
        
        {/* Active tracking display */}
        <div className="liquid-glass p-6 rounded-[2rem] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <SteeringWheelIcon size={20} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-white font-bold tracking-tight text-sm">Shift Terminal</h3>
              <p className="text-[10px] text-[#8e9bb0] font-mono uppercase">License: {driver?.licenseNumber}</p>
            </div>
          </div>

          {/* Off Shift controls */}
          {!isOnShift ? (
            <form onSubmit={handleStartShift} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">
                  Select Vehicle
                </label>
                <select
                  required
                  value={selectedBusId}
                  onChange={(e) => setSelectedBusId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-xs focus:outline-none"
                >
                  <option value="">Choose a registered bus...</option>
                  {buses.map((bus) => (
                    <option key={bus._id} value={bus._id}>
                      {bus.registrationNumber} ({bus.routeName})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedBusId}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50 text-black font-semibold rounded-xl text-xs transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
              >
                Go On Shift
              </button>
            </form>
          ) : (
            // On Shift controls
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8e9bb0]">Vehicle Status:</span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live Tracking</span>
                  </span>
                </div>
                
                <div className="space-y-1 text-xs text-slate-300">
                  <p className="flex justify-between">
                    <span>Active Bus:</span>
                    <strong className="text-white font-mono">{activeShiftInfo?.registrationNumber}</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Route:</span>
                    <strong className="text-white truncate max-w-[150px]">{activeShiftInfo?.routeName}</strong>
                  </p>
                </div>
              </div>

              {/* End shift button */}
              <button
                onClick={handleEndShift}
                className="w-full py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 active:scale-[0.98] font-semibold rounded-xl text-xs transition-all"
              >
                End Shift Session
              </button>
            </div>
          )}
        </div>

        {/* Live GPS Telemetry card (Cockpit theme: DESIGN_VARIANCE 8 visual density) */}
        {isOnShift && (
          <div className="liquid-glass p-6 rounded-[2rem] space-y-4">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">GPS Telemetry</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-[#8e9bb0] uppercase tracking-wide block">Speed</span>
                <span className="text-xl font-bold font-mono text-emerald-500 flex items-baseline gap-1">
                  {geo.speed_kmh || 0} <span className="text-[10px] text-[#8e9bb0] font-normal uppercase">km/h</span>
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-[#8e9bb0] uppercase tracking-wide block">Heading</span>
                <span className="text-xl font-bold font-mono text-emerald-500">
                  {geo.heading_deg || 0}°
                </span>
              </div>
            </div>

            {/* GPS Lock status */}
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] space-y-1">
              <p className="flex justify-between text-slate-400">
                <span>Signal Status:</span>
                <span className={geo.error ? 'text-amber-500' : 'text-emerald-500'}>
                  {geo.error ? 'GPS WARNING' : 'STRONG GPS LOCK'}
                </span>
              </p>
              <p className="flex justify-between text-slate-400">
                <span>Coordinates:</span>
                <span className="font-mono text-white">
                  {geo.coordinates ? `${geo.coordinates[1].toFixed(4)}, ${geo.coordinates[0].toFixed(4)}` : 'Awaiting lock...'}
                </span>
              </p>
            </div>

            {statusMsg && (
              <p className="text-[10px] text-[#8e9bb0] font-mono text-center bg-white/5 border border-white/5 py-2 rounded-lg">
                {statusMsg}
              </p>
            )}

            {error && (
              <p className="text-[10px] text-red-400 font-semibold text-center bg-red-500/10 border border-red-500/20 py-2 rounded-lg">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Driver Map Preview pane */}
      <div className="flex-grow min-h-[400px] lg:min-h-0 relative">
        <LiveMap
          buses={busMock}
          stops={[]}
          center={mapCenter}
          zoom={mapZoom}
        />
      </div>
    </div>
  );
};
export default DashboardPage;

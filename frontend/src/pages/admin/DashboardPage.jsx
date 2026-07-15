import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { LiveMap } from '../../components/LiveMap';
import { useWebSocket } from '../../hooks/useWebSocket';
import { 
  Bus, 
  Users, 
  Warning, 
  Pulse, 
  Cpu 
} from '@phosphor-icons/react';

export const DashboardPage = () => {
  const [activeStats, setActiveStats] = useState(null);
  const [activeBuses, setActiveBuses] = useState([]);
  const [stops, setStops] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const { locations, subscribe } = useWebSocket();

  // Fetch dashboard data — guarded for React Strict Mode double-mount
  useEffect(() => {
    let ignore = false;

    const loadAdminDashboard = async () => {
      try {
        const statsRes = await apiFetch('/api/analytics/system/active-buses');
        const statsData = await statsRes.json();
        if (!ignore && statsRes.ok) setActiveStats(statsData);

        const liveRes = await apiFetch('/api/locations/live?limit=100');
        const liveData = await liveRes.json();
        if (!ignore && liveRes.ok) {
          const busList = liveData.buses || [];
          setActiveBuses(busList);

          const activeIds = busList.map(b => b._id);
          if (activeIds.length > 0) subscribe(activeIds);
        }

        const stopsRes = await apiFetch('/api/stops?limit=500');
        const stopsData = await stopsRes.json();
        if (!ignore && stopsRes.ok) setStops(stopsData.stops || []);
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError('Failed to load system dashboard analytics.');
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadAdminDashboard();
    return () => { ignore = true; };
  }, [subscribe]);

  // Merge WebSocket positions into buses list
  const mergedBuses = activeBuses
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

  if (isLoading) {
    return (
      <div className="flex-grow flex justify-center items-center">
        <div className="text-[#8e9bb0] font-mono text-sm tracking-wider animate-pulse">
          LOADING ADMIN MONITOR...
        </div>
      </div>
    );
  }

  const activeCount = activeStats?.summary?.totalActive || 0;
  const inactiveCount = activeStats?.summary?.totalInactive || 0;
  const totalCount = activeStats?.summary?.total || 0;

  return (
    <div className="flex-grow flex flex-col gap-6 animate-fade-in-up">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">System Overview</h1>
        <p className="text-xs text-[#8e9bb0]">Central telemetry node watching live vehicles, routes, and server operations</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <Warning size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Bento Grid Stats Rows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1 */}
        <div className="liquid-glass p-6 rounded-[2rem] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#8e9bb0] uppercase font-mono tracking-wider block">Active Buses</span>
            <span className="text-3xl font-extrabold font-mono text-emerald-500 block">{activeCount}</span>
            <span className="text-[10px] text-[#8e9bb0] block font-mono">ON SERVICE ({totalCount} total)</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Bus size={24} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="liquid-glass p-6 rounded-[2rem] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#8e9bb0] uppercase font-mono tracking-wider block">Inactive Buses</span>
            <span className="text-3xl font-extrabold font-mono text-slate-400 block">{inactiveCount}</span>
            <span className="text-[10px] text-[#8e9bb0] block font-mono">OFF SHIFT</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-400">
            <Users size={24} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="liquid-glass p-6 rounded-[2rem] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-[#8e9bb0] uppercase font-mono tracking-wider block">Status</span>
            <span className="text-lg font-bold text-emerald-500 block flex items-center gap-1.5 uppercase font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span>Operational</span>
            </span>
            <span className="text-[10px] text-[#8e9bb0] block font-mono">DB LATENCY STABLE</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Pulse size={24} />
          </div>
        </div>

      </div>

      {/* Main split-view dashboard (Map + RTC break-downs) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-[450px]">
        {/* Map box */}
        <div className="lg:col-span-2 relative min-h-[350px] lg:min-h-0">
          <LiveMap 
            buses={mergedBuses} 
            stops={stops} 
            zoom={5} 
          />
        </div>

        {/* RTC grouping panels */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="liquid-glass p-6 rounded-[2rem] flex-grow overflow-y-auto max-h-[450px] lg:max-h-none">
            <h3 className="text-white font-bold tracking-tight text-base mb-4 flex items-center gap-2">
              <Cpu size={18} className="text-emerald-500" />
              <span>RTC Network Breakdown</span>
            </h3>

            <div className="space-y-3">
              {activeStats && activeStats.byRtc && Object.keys(activeStats.byRtc).length > 0 ? (
                Object.entries(activeStats.byRtc).map(([rtc, data]) => {
                  const total = data.active + data.inactive;
                  const percentActive = total > 0 ? Math.round((data.active / total) * 100) : 0;
                  
                  return (
                    <div 
                      key={rtc}
                      className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2 hover:border-emerald-500/20 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs font-mono">{rtc}</span>
                        <span className="text-[10px] text-emerald-500 font-mono font-semibold">
                          {percentActive}% Active
                        </span>
                      </div>
                      
                      {/* Segmented bar */}
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${percentActive}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-[#8e9bb0] font-mono">
                        <span>Active: {data.active}</span>
                        <span>Total: {total}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#8e9bb0] italic">No active operators loaded.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;

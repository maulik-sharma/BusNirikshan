import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { RoadHorizon, ArrowRight, Warning, Check, Shield } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

export const RoutesPage = () => {
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [rtcFilter, setRtcFilter] = useState('all');
  const [rtcList, setRtcList] = useState([]);

  const loadRoutes = async () => {
    try {
      const response = await apiFetch('/api/routes?limit=100');
      const data = await response.json();
      if (response.ok) {
        setRoutes(data.routes || []);
        
        // Extract unique RTC list for filtering dropdown
        const uniqueRtcs = Array.from(new Set((data.routes || []).map(r => r.rtc)));
        setRtcList(uniqueRtcs);
      } else {
        throw new Error(data.message || 'Failed to fetch routes.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching routes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const filteredRoutes = rtcFilter === 'all' 
    ? routes 
    : routes.filter(r => r.rtc === rtcFilter);

  return (
    <div className="flex-grow flex flex-col gap-6 animate-fade-in-up">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
            <RoadHorizon size={22} className="text-emerald-500" />
            <span>Bus Routes</span>
          </h1>
          <p className="text-xs text-[#8e9bb0]">Browse system routes, schedules, and active sequences</p>
        </div>

        {/* RTC Filter selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[#8e9bb0] uppercase font-semibold">RTC Operator:</span>
          <select 
            value={rtcFilter}
            onChange={(e) => setRtcFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#0d111b] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-xs focus:outline-none"
          >
            <option value="all">All Operators</option>
            {rtcList.map(rtc => (
              <option key={rtc} value={rtc}>{rtc}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <Warning size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid listing */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-[2rem] bg-white/5 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="text-center py-16 text-[#8e9bb0] text-sm">
          No routes available matching this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoutes.map((route) => (
            <div 
              key={route._id}
              className="liquid-glass p-6 rounded-[2rem] flex flex-col justify-between hover:border-emerald-500/20 transition-all duration-300 group"
            >
              <div>
                {/* RTC badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded font-mono font-semibold">
                    <Shield size={10} />
                    <span>{route.rtc}</span>
                  </span>
                  
                  <span className={`flex items-center gap-1 text-[10px] ${
                    route.isActive ? 'text-emerald-500' : 'text-slate-500'
                  }`}>
                    <Check size={10} />
                    <span>{route.isActive ? 'Active' : 'Suspended'}</span>
                  </span>
                </div>

                <h4 className="font-bold text-white text-base group-hover:text-emerald-500 transition-colors mb-2">
                  {route.name}
                </h4>

                <div className="space-y-1 text-xs text-[#8e9bb0]">
                  <p className="flex justify-between">
                    <span>Total Distance:</span>
                    <strong className="text-white font-mono">{route.totalDistanceKm} km</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Est. Duration:</span>
                    <strong className="text-white font-mono">{route.estimatedDurationMin} mins</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>Bus Stops:</span>
                    <strong className="text-white font-mono">{route.stopIds?.length || 0} stops</strong>
                  </p>
                </div>
              </div>

              {/* View Detail Action */}
              <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-end">
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-semibold group-hover:underline">
                  <span>Show Stops Sequence</span>
                  <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default RoutesPage;

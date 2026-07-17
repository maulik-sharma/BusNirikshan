import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { BellIcon, ClockIcon, TrashIcon, WarningIcon, InfoIcon, CheckIcon } from '@phosphor-icons/react';

export const AlertsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editThreshold, setEditThreshold] = useState(5);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    
    const loadAlerts = async () => {
      try {
        const response = await apiFetch('/api/notifications', { signal: controller.signal });
        const data = await response.json();
        if (!ignore && response.ok) {
          setSubscriptions(data.subscriptions || []);
        } else if (!ignore) {
          throw new Error(data.message || 'Failed to fetch active alerts.');
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (!ignore) {
          console.error(err);
          setError(err.message || 'Error loading alerts.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadAlerts();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  const handleUnsubscribe = async (stopId, routeId) => {
    try {
      const response = await apiFetch('/api/notifications/subscribe', {
        method: 'DELETE',
        body: JSON.stringify({ stopId, routeId }),
      });
      if (response.ok) {
        // Evict from state
        setSubscriptions(prev => prev.filter(sub => !(sub.stopId._id === stopId && sub.routeId._id === routeId)));
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete alert.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const startEdit = (sub) => {
    setEditingId(sub._id);
    setEditThreshold(sub.thresholdMinutes);
  };

  const handleUpdateThreshold = async (stopId, routeId) => {
    try {
      const response = await apiFetch('/api/notifications/subscribe', {
        method: 'PATCH',
        body: JSON.stringify({ stopId, routeId, thresholdMinutes: Number(editThreshold) }),
      });
      if (response.ok) {
        const data = await response.json();
        setEditingId(null);
        setSubscriptions(prev => prev.map(sub => 
          sub._id === data.subscription._id ? data.subscription : sub
        ));
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update alert threshold.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="flex-grow flex flex-col gap-6 animate-fade-in-up">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
          <BellIcon size={22} className="text-emerald-500" />
          <span>Active ETA Alerts</span>
        </h1>
        <p className="text-xs text-[#8e9bb0]">Manage your stop thresholds and watch live approaching schedules</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <WarningIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="liquid-glass p-8 rounded-[2rem] text-center text-[#8e9bb0]">
          <InfoIcon size={32} className="mx-auto text-[#8e9bb0]/40 mb-3" />
          <h3 className="font-bold text-white mb-1">No Alerts Setup</h3>
          <p className="text-xs max-w-sm mx-auto mb-4">
            You can configure alerts directly from any Bus Stop detail board to get notified when buses get near.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => {
            const hasTriggered = sub.alertTriggered;
            
            return (
              <div 
                key={sub._id}
                className="liquid-glass p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-emerald-500/20 transition-all duration-300"
              >
                {/* Details column */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white text-sm">{sub.routeId?.routeName}</span>
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded font-mono">
                      {sub.routeId?.rtc}
                    </span>
                  </div>

                  <p className="text-xs text-[#8e9bb0] flex items-center gap-1.5">
                    <ClockIcon size={14} className="text-[#8e9bb0]" />
                    <span>Watch Stop: <strong className="text-white">{sub.stopId?.name}</strong> ({sub.stopId?.city})</span>
                  </p>
                </div>

                {/* Status and Action Column */}
                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                  
                  {/* Threshold Settings */}
                  <div className="flex items-center gap-2">
                    {editingId === sub._id ? (
                      <div className="flex items-center gap-2 bg-[#07090e] border border-white/5 rounded-xl px-2 py-1">
                        <input 
                          type="number"
                          min={1}
                          max={60}
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(e.target.value)}
                          className="w-12 bg-transparent text-white text-xs font-mono font-bold focus:outline-none text-center"
                        />
                        <button
                          onClick={() => handleUpdateThreshold(sub.stopId._id, sub.routeId._id)}
                          className="p-1 rounded bg-emerald-500 text-black active:scale-90"
                        >
                          <CheckIcon size={12} weight="bold" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => startEdit(sub)}
                        className="text-xs text-slate-400 hover:text-white hover:underline cursor-pointer"
                      >
                        Alert Threshold: <strong className="text-white font-mono">{sub.thresholdMinutes}m</strong>
                      </button>
                    )}
                  </div>

                  {/* Nearest Bus info */}
                  <div className="flex items-center gap-4">
                    {sub.nearestBus ? (
                      <div className="text-right">
                        <span className={`text-xs font-semibold block ${
                          hasTriggered ? 'text-amber-500 animate-pulse' : 'text-emerald-500'
                        }`}>
                          {hasTriggered ? 'THRESHOLD REACHED' : 'Approaching'}
                        </span>
                        <span className="text-[10px] text-[#8e9bb0] font-mono block">
                          {sub.nearestBus.registrationNumber} ({sub.nearestBus.eta_minutes} mins away)
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic block">No live buses approaching</span>
                    )}

                    {/* Delete action */}
                    <button
                      onClick={() => handleUnsubscribe(sub.stopId._id, sub.routeId._id)}
                      className="p-2 rounded-xl border border-white/5 text-[#8e9bb0] hover:text-red-500 hover:bg-red-500/10 active:scale-95 transition-all"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default AlertsPage;

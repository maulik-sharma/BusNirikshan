import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { Heartbeat, Warning, ArrowClockwise, Database, HardDrives, Cpu } from '@phosphor-icons/react';

export const SystemHealthPage = () => {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadHealth = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/admin/system/health');
      const data = await response.json();
      if (response.ok) {
        setHealth(data);
      } else {
        throw new Error(data.message || 'Health check failed.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to connect to system health endpoint.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const getStatusColor = (status) => {
    if (status === 'connected' || status === 'ready' || status === 'ok') return 'text-emerald-500';
    if (status === 'connecting' || status === 'reconnecting') return 'text-amber-500';
    return 'text-red-500';
  };

  const getStatusDot = (status) => {
    if (status === 'connected' || status === 'ready' || status === 'ok') return 'bg-emerald-500';
    if (status === 'connecting' || status === 'reconnecting') return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex-grow flex flex-col gap-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
            <Heartbeat size={22} className="text-emerald-500" />
            <span>System Health</span>
          </h1>
          <p className="text-xs text-[#8e9bb0]">Monitor database connections, cache latency, and server instance status</p>
        </div>
        <button onClick={loadHealth} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 active:scale-[0.98] text-white font-semibold rounded-xl text-xs transition-all">
          <ArrowClockwise size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <Warning size={18} />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-white/5 border border-white/5 animate-pulse rounded-[2rem]" />
          ))}
        </div>
      ) : health ? (
        <div className="space-y-6">
          {/* Top-level status cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* MongoDB */}
            <div className="liquid-glass p-6 rounded-[2rem] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Database size={20} className="text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">MongoDB</h4>
                    <p className="text-[10px] text-[#8e9bb0] font-mono uppercase">Primary Data Store</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-semibold ${getStatusColor(health.mongodb?.status)}`}>
                  <span className={`w-2 h-2 rounded-full ${getStatusDot(health.mongodb?.status)} animate-pulse`} />
                  {health.mongodb?.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[#8e9bb0]">Ping Latency:</span>
                  <span className="font-mono text-white font-bold">{health.mongodb?.latency_ms ?? 'N/A'} ms</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[#8e9bb0]">Host:</span>
                  <span className="font-mono text-white text-[10px]">{health.mongodb?.host || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Redis */}
            <div className="liquid-glass p-6 rounded-[2rem] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <HardDrives size={20} className="text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Redis</h4>
                    <p className="text-[10px] text-[#8e9bb0] font-mono uppercase">Cache / Pub-Sub</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-semibold ${getStatusColor(health.redis?.status)}`}>
                  <span className={`w-2 h-2 rounded-full ${getStatusDot(health.redis?.status)} animate-pulse`} />
                  {health.redis?.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[#8e9bb0]">Ping Latency:</span>
                  <span className="font-mono text-white font-bold">{health.redis?.latency_ms ?? 'N/A'} ms</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[#8e9bb0]">Memory Used:</span>
                  <span className="font-mono text-white text-[10px]">{health.redis?.memory || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Server Instances */}
            <div className="liquid-glass p-6 rounded-[2rem] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Cpu size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Server</h4>
                    <p className="text-[10px] text-[#8e9bb0] font-mono uppercase">Express Cluster</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[#8e9bb0]">Uptime:</span>
                  <span className="font-mono text-white font-bold">{health.server?.uptime || 'N/A'}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-[#8e9bb0]">Process ID:</span>
                  <span className="font-mono text-white text-[10px]">{health.server?.pid || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Server instances list */}
          {health.instances && health.instances.length > 0 && (
            <div className="liquid-glass p-6 rounded-[2rem]">
              <h3 className="text-white font-bold tracking-tight text-base mb-4">Active Server Instances</h3>
              <div className="space-y-2">
                {health.instances.map((instance, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-white font-mono text-xs">{instance.hostname || `Instance ${idx + 1}`}</span>
                    </div>
                    <span className="text-[10px] text-[#8e9bb0] font-mono">PID: {instance.pid || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
export default SystemHealthPage;

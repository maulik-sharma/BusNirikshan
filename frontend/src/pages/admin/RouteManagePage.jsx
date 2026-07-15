import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { RoadHorizon, Plus, Pencil, Trash, Warning, Check, X } from '@phosphor-icons/react';

const emptyForm = { name: '', rtc: '', totalDistanceKm: '', estimatedDurationMin: '', stopIds: '' };

export const RouteManagePage = () => {
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const loadRoutes = async () => {
    try {
      setIsLoading(true);
      const response = await apiFetch(`/api/routes?page=${page}&limit=15`);
      const data = await response.json();
      if (response.ok) {
        setRoutes(data.routes || []);
        setPagination(data.pagination || null);
      }
    } catch (err) {
      setError('Failed to load routes.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStops = async () => {
    try {
      const res = await apiFetch('/api/stops?limit=500');
      const data = await res.json();
      if (res.ok) setStops(data.stops || []);
    } catch (e) { /* silent */ }
  };

  useEffect(() => { loadRoutes(); loadStops(); }, [page]);

  const openCreate = () => {
    setEditingRoute(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (route) => {
    setEditingRoute(route);
    const ids = (route.stopIds || []).map(s => typeof s === 'object' ? s._id : s);
    setForm({
      name: route.name,
      rtc: route.rtc,
      totalDistanceKm: route.totalDistanceKm,
      estimatedDurationMin: route.estimatedDurationMin,
      stopIds: ids.join(', '),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const stopIdsArray = form.stopIds.split(',').map(s => s.trim()).filter(Boolean);
      const body = {
        name: form.name,
        rtc: form.rtc,
        totalDistanceKm: Number(form.totalDistanceKm),
        estimatedDurationMin: Number(form.estimatedDurationMin),
        stopIds: stopIdsArray,
      };
      let response;
      if (editingRoute) {
        response = await apiFetch(`/api/routes/${editingRoute._id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        response = await apiFetch('/api/routes', { method: 'POST', body: JSON.stringify(body) });
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Operation failed');
      setSuccess(editingRoute ? 'Route updated.' : 'Route created.');
      setShowModal(false);
      loadRoutes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (routeId) => {
    if (!confirm('Delete this route permanently?')) return;
    setError(''); setSuccess('');
    try {
      const response = await apiFetch(`/api/routes/${routeId}`, { method: 'DELETE' });
      if (!response.ok) { const d = await response.json(); throw new Error(d.message); }
      setSuccess('Route deleted.');
      loadRoutes();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="flex-grow flex flex-col gap-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
            <RoadHorizon size={22} className="text-emerald-500" />
            <span>Manage Routes</span>
          </h1>
          <p className="text-xs text-[#8e9bb0]">Define, sequence, and manage bus route definitions</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-black font-semibold rounded-xl text-xs transition-all">
          <Plus size={14} weight="bold" /> Add Route
        </button>
      </div>

      {error && <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"><Warning size={18} /><span>{error}</span></div>}
      {success && <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"><Check size={18} /><span>{success}</span></div>}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-white/5 border border-white/5 animate-pulse rounded-xl" />)}</div>
      ) : (
        <div className="liquid-glass rounded-[2rem] border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-[#8e9bb0] uppercase tracking-wider font-semibold bg-white/2">
                  <th className="py-4 px-6">Route Name</th>
                  <th className="py-4 px-6">RTC</th>
                  <th className="py-4 px-6">Distance</th>
                  <th className="py-4 px-6">Duration</th>
                  <th className="py-4 px-6">Stops</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {routes.map((route) => (
                  <tr key={route._id} className="hover:bg-white/2 transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">{route.name}</td>
                    <td className="py-4 px-6 font-mono text-[#8e9bb0]">{route.rtc}</td>
                    <td className="py-4 px-6 font-mono">{route.totalDistanceKm} km</td>
                    <td className="py-4 px-6 font-mono">{route.estimatedDurationMin} min</td>
                    <td className="py-4 px-6 font-mono">{route.stopIds?.length || 0}</td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${route.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                        {route.isActive ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => openEdit(route)} className="p-1.5 rounded-lg border border-white/5 text-[#8e9bb0] hover:text-white hover:bg-white/5 active:scale-95 transition-all"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(route._id)} className="p-1.5 rounded-lg border border-white/5 text-[#8e9bb0] hover:text-red-500 hover:bg-red-500/10 active:scale-95 transition-all"><Trash size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#8e9bb0]">Page {pagination.page} of {pagination.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 bg-[#0d111b] border border-white/5 hover:border-white/10 active:scale-95 disabled:opacity-40 rounded-xl text-xs text-white">Prev</button>
            <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 bg-[#0d111b] border border-white/5 hover:border-white/10 active:scale-95 disabled:opacity-40 rounded-xl text-xs text-white">Next</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg liquid-glass p-8 rounded-[2.5rem] border border-white/5 bg-[#0d111b]/95 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">{editingRoute ? 'Edit Route' : 'Create New Route'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#8e9bb0] hover:text-white hover:bg-white/5"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">Route Name</label>
                  <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">RTC Operator</label>
                  <input type="text" value={form.rtc} onChange={(e) => updateField('rtc', e.target.value)} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">Distance (km)</label>
                  <input type="number" step="any" min={0} value={form.totalDistanceKm} onChange={(e) => updateField('totalDistanceKm', e.target.value)} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">Est. Duration (min)</label>
                  <input type="number" min={0} value={form.estimatedDurationMin} onChange={(e) => updateField('estimatedDurationMin', e.target.value)} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">Stop IDs (comma separated, in sequence)</label>
                <textarea value={form.stopIds} onChange={(e) => updateField('stopIds', e.target.value)} required rows={3} className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-xs focus:outline-none transition-all font-mono resize-none" />
                <p className="text-[10px] text-[#8e9bb0]">Available stops: {stops.length}. Enter MongoDB ObjectIds separated by commas.</p>
              </div>
              <button type="submit" className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-black font-semibold rounded-xl text-sm transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)]">
                {editingRoute ? 'Save Changes' : 'Create Route'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default RouteManagePage;

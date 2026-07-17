import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { BusIcon, PlusIcon, PencilIcon, TrashIcon, WarningIcon, CheckIcon, XIcon } from '@phosphor-icons/react';

const emptyForm = { registrationNumber: '', routeId: '', rtc: '', routeName: '', capacity: '' };

export const BusManagePage = () => {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const loadBuses = async () => {
    try {
      setIsLoading(true);
      const response = await apiFetch(`/api/buses?page=${page}&limit=15`);
      const data = await response.json();
      if (response.ok) {
        setBuses(data.buses || []);
        setPagination(data.pagination || null);
      }
    } catch (err) {
      setError('Failed to load buses.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoutes = async () => {
    try {
      const res = await apiFetch('/api/routes?limit=200');
      const data = await res.json();
      if (res.ok) setRoutes(data.routes || []);
    } catch (e) { /* silent */ }
  };

  useEffect(() => { loadBuses(); loadRoutes(); }, [page]);

  const openCreate = () => {
    setEditingBus(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (bus) => {
    setEditingBus(bus);
    setForm({
      registrationNumber: bus.registrationNumber,
      routeId: bus.routeId?._id || bus.routeId || '',
      rtc: bus.rtc || '',
      routeName: bus.routeName || '',
      capacity: bus.capacity || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const body = { ...form, capacity: Number(form.capacity) };
      let response;
      if (editingBus) {
        response = await apiFetch(`/api/buses/${editingBus._id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        response = await apiFetch('/api/buses', { method: 'POST', body: JSON.stringify(body) });
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Operation failed');
      setSuccess(editingBus ? 'Bus updated successfully.' : 'Bus created successfully.');
      setShowModal(false);
      loadBuses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (busId) => {
    if (!confirm('Delete this bus permanently?')) return;
    setError(''); setSuccess('');
    try {
      const response = await apiFetch(`/api/buses/${busId}`, { method: 'DELETE' });
      if (!response.ok) { const d = await response.json(); throw new Error(d.message); }
      setSuccess('Bus deleted.');
      loadBuses();
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
            <BusIcon size={22} className="text-emerald-500" />
            <span>Manage Buses</span>
          </h1>
          <p className="text-xs text-[#8e9bb0]">Register, update, and remove fleet vehicles</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-black font-semibold rounded-xl text-xs transition-all">
          <PlusIcon size={14} weight="bold" /> Add Bus
        </button>
      </div>

      {error && <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"><WarningIcon size={18} /><span>{error}</span></div>}
      {success && <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"><CheckIcon size={18} /><span>{success}</span></div>}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-white/5 border border-white/5 animate-pulse rounded-xl" />)}</div>
      ) : (
        <div className="liquid-glass rounded-[2rem] border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-[#8e9bb0] uppercase tracking-wider font-semibold bg-white/2">
                  <th className="py-4 px-6">Reg. Number</th>
                  <th className="py-4 px-6">Route</th>
                  <th className="py-4 px-6">RTC</th>
                  <th className="py-4 px-6">Capacity</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {buses.map((bus) => (
                  <tr key={bus._id} className="hover:bg-white/2 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-white">{bus.registrationNumber}</td>
                    <td className="py-4 px-6">{bus.routeName}</td>
                    <td className="py-4 px-6 font-mono text-[#8e9bb0]">{bus.rtc}</td>
                    <td className="py-4 px-6 font-mono">{bus.capacity}</td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${bus.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                        {bus.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => openEdit(bus)} className="p-1.5 rounded-lg border border-white/5 text-[#8e9bb0] hover:text-white hover:bg-white/5 active:scale-95 transition-all"><PencilIcon size={14} /></button>
                        <button onClick={() => handleDelete(bus._id)} className="p-1.5 rounded-lg border border-white/5 text-[#8e9bb0] hover:text-red-500 hover:bg-red-500/10 active:scale-95 transition-all"><TrashIcon size={14} /></button>
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
          <div className="w-full max-w-lg liquid-glass p-8 rounded-[2.5rem] border border-white/5 bg-[#0d111b]/95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">{editingBus ? 'Edit Bus' : 'Register New Bus'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#8e9bb0] hover:text-white hover:bg-white/5"><XIcon size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">Registration Number</label>
                <input type="text" value={form.registrationNumber} onChange={(e) => updateField('registrationNumber', e.target.value)} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">Route</label>
                <select value={form.routeId} onChange={(e) => { const r = routes.find(rt => rt._id === e.target.value); updateField('routeId', e.target.value); if (r) { updateField('rtc', r.rtc); updateField('routeName', r.name); } }} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none">
                  <option value="">Select route...</option>
                  {routes.map(r => <option key={r._id} value={r._id}>{r.name} ({r.rtc})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">RTC</label>
                  <input type="text" value={form.rtc} onChange={(e) => updateField('rtc', e.target.value)} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">Capacity</label>
                  <input type="number" min={1} value={form.capacity} onChange={(e) => updateField('capacity', e.target.value)} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all font-mono" />
                </div>
              </div>
              <button type="submit" className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-black font-semibold rounded-xl text-sm transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)]">
                {editingBus ? 'Save Changes' : 'Register Bus'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default BusManagePage;

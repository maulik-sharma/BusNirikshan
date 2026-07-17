import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { MapPinIcon, PlusIcon, PencilIcon, TrashIcon, WarningIcon, CheckIcon, XIcon } from '@phosphor-icons/react';

const emptyForm = { name: '', city: '', state: '', rtc: '', longitude: '', latitude: '' };

export const StopManagePage = () => {
  const [stops, setStops] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const loadStops = async () => {
    try {
      setIsLoading(true);
      const response = await apiFetch(`/api/stops?page=${page}&limit=15`);
      const data = await response.json();
      if (response.ok) {
        setStops(data.stops || []);
        setPagination(data.pagination || null);
      }
    } catch (err) {
      setError('Failed to load stops.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadStops(); }, [page]);

  const openCreate = () => {
    setEditingStop(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (stop) => {
    setEditingStop(stop);
    setForm({
      name: stop.name,
      city: stop.city,
      state: stop.state,
      rtc: Array.isArray(stop.rtc) ? stop.rtc.join(', ') : stop.rtc || '',
      longitude: stop.location?.coordinates?.[0] || '',
      latitude: stop.location?.coordinates?.[1] || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const rtcArray = form.rtc.split(',').map(s => s.trim()).filter(Boolean);
      const body = {
        name: form.name,
        city: form.city,
        state: form.state,
        rtc: rtcArray,
        location: {
          type: 'Point',
          coordinates: [Number(form.longitude), Number(form.latitude)]
        }
      };
      let response;
      if (editingStop) {
        response = await apiFetch(`/api/stops/${editingStop._id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        response = await apiFetch('/api/stops', { method: 'POST', body: JSON.stringify(body) });
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Operation failed');
      setSuccess(editingStop ? 'Stop updated.' : 'Stop created.');
      setShowModal(false);
      loadStops();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (stopId) => {
    if (!confirm('Delete this stop permanently?')) return;
    setError(''); setSuccess('');
    try {
      const response = await apiFetch(`/api/stops/${stopId}`, { method: 'DELETE' });
      if (!response.ok) { const d = await response.json(); throw new Error(d.message); }
      setSuccess('Stop deleted.');
      loadStops();
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
            <MapPinIcon size={22} className="text-emerald-500" />
            <span>Manage Stops</span>
          </h1>
          <p className="text-xs text-[#8e9bb0]">Create, update, and geolocate bus stop terminals</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-black font-semibold rounded-xl text-xs transition-all">
          <PlusIcon size={14} weight="bold" /> Add Stop
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
                  <th className="py-4 px-6">Stop Name</th>
                  <th className="py-4 px-6">City</th>
                  <th className="py-4 px-6">State</th>
                  <th className="py-4 px-6">RTC</th>
                  <th className="py-4 px-6">Coordinates</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {stops.map((stop) => (
                  <tr key={stop._id} className="hover:bg-white/2 transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">{stop.name}</td>
                    <td className="py-4 px-6">{stop.city}</td>
                    <td className="py-4 px-6 text-[#8e9bb0]">{stop.state}</td>
                    <td className="py-4 px-6 font-mono text-[10px]">{Array.isArray(stop.rtc) ? stop.rtc.join(', ') : stop.rtc}</td>
                    <td className="py-4 px-6 font-mono text-[10px] text-[#8e9bb0]">
                      {stop.location?.coordinates ? `${stop.location.coordinates[1].toFixed(4)}, ${stop.location.coordinates[0].toFixed(4)}` : 'N/A'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => openEdit(stop)} className="p-1.5 rounded-lg border border-white/5 text-[#8e9bb0] hover:text-white hover:bg-white/5 active:scale-95 transition-all"><PencilIcon size={14} /></button>
                        <button onClick={() => handleDelete(stop._id)} className="p-1.5 rounded-lg border border-white/5 text-[#8e9bb0] hover:text-red-500 hover:bg-red-500/10 active:scale-95 transition-all"><TrashIcon size={14} /></button>
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
              <h3 className="text-lg font-bold text-white">{editingStop ? 'Edit Stop' : 'Create New Stop'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#8e9bb0] hover:text-white hover:bg-white/5"><XIcon size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">Stop Name</label>
                <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">City</label>
                  <input type="text" value={form.city} onChange={(e) => updateField('city', e.target.value)} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">State</label>
                  <input type="text" value={form.state} onChange={(e) => updateField('state', e.target.value)} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">RTC Operators (comma separated)</label>
                <input type="text" value={form.rtc} onChange={(e) => updateField('rtc', e.target.value)} required placeholder="GSRTC, MSRTC" className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">Longitude</label>
                  <input type="number" step="any" value={form.longitude} onChange={(e) => updateField('longitude', e.target.value)} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">Latitude</label>
                  <input type="number" step="any" value={form.latitude} onChange={(e) => updateField('latitude', e.target.value)} required className="w-full px-4 py-2.5 bg-[#07090e] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-sm focus:outline-none transition-all font-mono" />
                </div>
              </div>
              <button type="submit" className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-black font-semibold rounded-xl text-sm transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)]">
                {editingStop ? 'Save Changes' : 'Create Stop'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default StopManagePage;

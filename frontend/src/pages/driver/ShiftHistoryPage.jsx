import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { ClockIcon, WarningIcon, InfoIcon, CalendarIcon } from '@phosphor-icons/react';

export const ShiftHistoryPage = () => {
  const [shifts, setShifts] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  const loadShiftHistory = async () => {
    try {
      setIsLoading(true);
      // 1. Resolve current driver profile
      const driverRes = await apiFetch('/api/drivers/me');
      const driverData = await driverRes.json();
      
      if (!driverRes.ok || !driverData.driver) {
        throw new Error(driverData.message || 'Driver profile not registered.');
      }

      const driverId = driverData.driver._id;

      // 2. Fetch shift records
      const shiftsRes = await apiFetch(`/api/drivers/${driverId}/shifts?page=${page}&limit=10`);
      const shiftsData = await shiftsRes.json();

      if (shiftsRes.ok) {
        setShifts(shiftsData.shifts || []);
        setPagination(shiftsData.pagination || null);
      } else {
        throw new Error(shiftsData.message || 'Failed to fetch shift logs.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error loading shift history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShiftHistory();
  }, [page]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Active Now';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="flex-grow flex flex-col gap-6 animate-fade-in-up">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
          <ClockIcon size={22} className="text-emerald-500" />
          <span>Shift Logs History</span>
        </h1>
        <p className="text-xs text-[#8e9bb0]">Track your historical driving hours and recorded geolocation logs</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <WarningIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table log container */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/5 border border-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : shifts.length === 0 ? (
        <div className="liquid-glass p-8 rounded-[2rem] text-center text-[#8e9bb0]">
          <InfoIcon size={32} className="mx-auto text-[#8e9bb0]/40 mb-3" />
          <h3 className="font-bold text-white mb-1">No Shift Logs</h3>
          <p className="text-xs max-w-sm mx-auto">
            You have not recorded any shift sequences yet. Click "Active Shift" to start tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="liquid-glass rounded-[2rem] border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-[#8e9bb0] uppercase tracking-wider font-semibold font-sans bg-white/2">
                    <th className="py-4 px-6">Bus Plate</th>
                    <th className="py-4 px-6">Started At</th>
                    <th className="py-4 px-6">Ended At</th>
                    <th className="py-4 px-6">Duration</th>
                    <th className="py-4 px-6">GPS Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {shifts.map((shift) => (
                    <tr key={shift._id} className="hover:bg-white/2 transition-colors">
                      <td className="py-4 px-6 font-mono text-white font-bold">{shift.busId?.registrationNumber || 'Assigned'}</td>
                      <td className="py-4 px-6">{formatDate(shift.startedAt)}</td>
                      <td className="py-4 px-6">{formatDate(shift.endedAt)}</td>
                      <td className="py-4 px-6 font-mono">
                        {shift.durationMin !== null ? `${shift.durationMin} mins` : <span className="text-emerald-500 animate-pulse font-semibold">Active</span>}
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-400">{shift.totalPointsRecorded} points</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination bar */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-[#8e9bb0]">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} shifts total)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={!pagination.hasPrevPage}
                  onClick={() => setPage(prev => prev - 1)}
                  className="px-3 py-1.5 bg-[#0d111b] border border-white/5 hover:border-white/10 active:scale-95 disabled:opacity-40 rounded-xl text-xs text-white"
                >
                  Prev
                </button>
                <button
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage(prev => prev + 1)}
                  className="px-3 py-1.5 bg-[#0d111b] border border-white/5 hover:border-white/10 active:scale-95 disabled:opacity-40 rounded-xl text-xs text-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default ShiftHistoryPage;

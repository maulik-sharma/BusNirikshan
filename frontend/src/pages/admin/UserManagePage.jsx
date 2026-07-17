import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { UsersIcon, WarningIcon, CheckIcon, UserCheckIcon, ShieldIcon } from '@phosphor-icons/react';

export const UserManagePage = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const filterQuery = roleFilter ? `&role=${roleFilter}` : '';
      const response = await apiFetch(`/api/admin/users?page=${page}&limit=10${filterQuery}`);
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users || []);
        setPagination(data.pagination || null);
      } else {
        throw new Error(data.message || 'Failed to fetch users list.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter]);

  const handleRoleChange = async (userId, newRole) => {
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      const data = await response.json();

      if (response.ok) {
        setSuccess(`User role updated to ${newRole} successfully.`);
        // Reload users list
        loadUsers();
      } else {
        throw new Error(data.message || 'Failed to update user role.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="flex-grow flex flex-col gap-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
            <UsersIcon size={22} className="text-emerald-500" />
            <span>Manage Users</span>
          </h1>
          <p className="text-xs text-[#8e9bb0]">Configure user accounts, profiles, and role assignments</p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[#8e9bb0] uppercase font-semibold">Filter Role:</span>
          <select 
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-[#0d111b] border border-white/5 focus:border-emerald-500/40 rounded-xl text-white text-xs focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="user">Passenger</option>
            <option value="driver">Driver</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <WarningIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckIcon size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Users table */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/5 border border-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="liquid-glass p-8 rounded-[2rem] text-center text-[#8e9bb0]">
          No users registered in this system.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="liquid-glass rounded-[2rem] border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-[#8e9bb0] uppercase tracking-wider font-semibold font-sans bg-white/2">
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Email</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">RTC Operator</th>
                    <th className="py-4 px-6 text-right">Assign Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {users.map((item) => (
                    <tr key={item._id} className="hover:bg-white/2 transition-colors">
                      <td className="py-4 px-6 font-semibold text-white">{item.name}</td>
                      <td className="py-4 px-6 font-mono text-[#8e9bb0]">{item.email}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold uppercase font-mono ${
                          item.role === 'admin' 
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
                            : item.role === 'driver' 
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                        }`}>
                          {item.role === 'admin' ? <ShieldIcon size={10} /> : <UserCheckIcon size={10} />}
                          <span>{item.role}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-400">{item.rtc || 'N/A'}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex gap-1.5 justify-end">
                          <button
                            disabled={item.role === 'user'}
                            onClick={() => handleRoleChange(item._id, 'user')}
                            className="px-2.5 py-1 rounded bg-[#07090e] border border-white/5 text-[10px] hover:text-emerald-500 hover:border-emerald-500/20 disabled:opacity-30 disabled:hover:text-slate-400 transition-all cursor-pointer"
                          >
                            Passenger
                          </button>
                          <button
                            disabled={item.role === 'driver'}
                            onClick={() => handleRoleChange(item._id, 'driver')}
                            className="px-2.5 py-1 rounded bg-[#07090e] border border-white/5 text-[10px] hover:text-amber-500 hover:border-amber-500/20 disabled:opacity-30 disabled:hover:text-slate-400 transition-all cursor-pointer"
                          >
                            Driver
                          </button>
                          <button
                            disabled={item.role === 'admin'}
                            onClick={() => handleRoleChange(item._id, 'admin')}
                            className="px-2.5 py-1 rounded bg-[#07090e] border border-white/5 text-[10px] hover:text-red-500 hover:border-red-500/20 disabled:opacity-30 disabled:hover:text-slate-400 transition-all cursor-pointer"
                          >
                            Admin
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-[#8e9bb0]">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} users total)
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
export default UserManagePage;

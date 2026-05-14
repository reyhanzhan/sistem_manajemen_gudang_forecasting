'use client';

import React, { useEffect, useState } from 'react';
import { Users as UsersIcon, Shield, Pencil, Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import { usersApi } from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading]= useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll({ search });
      setUsers(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const roleColor: Record<string, string> = {
    ADMIN: 'bg-red-50 text-red-700 border border-red-200',
    MANAGER: 'bg-primary-50 text-primary-700 border border-primary-200',
    STAFF: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };

  const avatarGradient: Record<string, string> = {
    ADMIN: 'from-red-500 to-rose-500',
    MANAGER: 'from-primary-500 to-violet-500',
    STAFF: 'from-emerald-500 to-teal-500',
  };

  return (
    <div>
      <Header title="User Management" subtitle="Manage system users and roles (Admin only)" />
      <div className="page-container">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="input-field pl-10" />
        </div>

        <div className="card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="table-header">User</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Warehouses</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="skeleton h-4 w-3/4" /></td>
                    ))}</tr>
                  ))
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16 text-gray-400">
                    <UsersIcon size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No users found</p>
                  </td></tr>
                ) : users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 bg-gradient-to-br ${avatarGradient[user.role] || 'from-gray-400 to-gray-500'} rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <span className="font-semibold text-gray-900">{user.firstName} {user.lastName}</span>
                      </div>
                    </td>
                    <td className="table-cell text-sm text-gray-600">{user.email}</td>
                    <td className="table-cell">
                      <span className={`badge ${roleColor[user.role] || 'badge-neutral'}`}>
                        <Shield size={11} className="mr-0.5" />
                        {user.role}
                      </span>
                    </td>
                    <td className="table-cell text-sm text-gray-500">
                      {user.userWarehouses?.map((uw: any) => uw.warehouse?.name).join(', ') || '-'}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell text-sm text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

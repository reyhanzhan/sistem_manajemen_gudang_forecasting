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
    ADMIN: 'bg-red-100 text-red-700',
    MANAGER: 'bg-blue-100 text-blue-700',
    STAFF: 'bg-green-100 text-green-700',
  };

  return (
    <div>
      <Header title="User Management" subtitle="Manage system users and roles (Admin only)" />
      <div className="p-6 space-y-6">
        <div className="relative max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="input-field pl-10" />
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">User</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Warehouses</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" /></td>
                    ))}</tr>
                  ))
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">
                    <UsersIcon size={40} className="mx-auto mb-2 opacity-50" />No users found
                  </td></tr>
                ) : users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <span className="font-medium">{user.firstName} {user.lastName}</span>
                      </div>
                    </td>
                    <td className="table-cell text-sm">{user.email}</td>
                    <td className="table-cell">
                      <span className={`badge ${roleColor[user.role] || 'bg-gray-100 text-gray-700'}`}>
                        <Shield size={12} className="mr-1 inline-block" />
                        {user.role}
                      </span>
                    </td>
                    <td className="table-cell text-sm">
                      {user.userWarehouses?.map((uw: any) => uw.warehouse?.name).join(', ') || '-'}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell text-sm text-gray-500">
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

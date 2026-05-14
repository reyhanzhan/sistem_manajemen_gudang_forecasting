'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Truck, Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import { suppliersApi } from '@/lib/api';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', code: '', email: '', phone: '', address: '', city: '', contactPerson: '',
  });

  useEffect(() => { load(); }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await suppliersApi.getAll({ search });
      setSuppliers(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await suppliersApi.update(editing.id, form);
      } else {
        await suppliersApi.create(form);
      }
      resetForm();
      load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    try { await suppliersApi.delete(id); load(); } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', code: '', email: '', phone: '', address: '', city: '', contactPerson: '' });
  };

  const edit = (s: any) => {
    setEditing(s);
    setForm({
      name: s.name, code: s.code, email: s.email || '',
      phone: s.phone || '', address: s.address || '',
      city: s.city || '', contactPerson: s.contactPerson || '',
    });
    setShowForm(true);
  };

  return (
    <div>
      <Header title="Suppliers" subtitle="Manage supplier information" />
      <div className="page-container">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..." className="input-field pl-10" />
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Supplier
          </button>
        </div>

        {showForm && (
          <div className="card border border-primary-200 bg-primary-50/30">
            <h3 className="text-base font-bold text-gray-900 mb-5">{editing ? 'Edit Supplier' : 'New Supplier'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="input-label">Name *</label>
                <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="input-label">Code *</label>
                <input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><label className="input-label">Contact Person</label>
                <input className="input-field" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></div>
              <div><label className="input-label">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="input-label">Phone</label>
                <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="input-label">City</label>
                <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="md:col-span-2 lg:col-span-3"><label className="input-label">Address</label>
                <textarea className="input-field" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-5 pt-4 border-t border-primary-100">
              <button onClick={handleSave} className="btn-primary">Save</button>
              <button onClick={resetForm} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="table-header">Supplier</th>
                  <th className="table-header">Code</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header">City</th>
                  <th className="table-header text-center">Products</th>
                  <th className="table-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="skeleton h-4 w-3/4" /></td>
                    ))}</tr>
                  ))
                ) : suppliers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-16 text-gray-400">
                    <Truck size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No suppliers found</p>
                  </td></tr>
                ) : suppliers.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                          <Truck size={16} className="text-violet-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{s.name}</div>
                          {s.contactPerson && <div className="text-xs text-gray-400">{s.contactPerson}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs text-gray-500">{s.code}</td>
                    <td className="table-cell text-sm">
                      {s.email && <div className="text-gray-700">{s.email}</div>}
                      {s.phone && <div className="text-gray-400 text-xs">{s.phone}</div>}
                    </td>
                    <td className="table-cell text-sm text-gray-600">{s.city || '-'}</td>
                    <td className="table-cell text-center">
                      <span className="badge badge-neutral">{s._count?.productSuppliers || 0}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => edit(s)} className="btn-icon"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                      </div>
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

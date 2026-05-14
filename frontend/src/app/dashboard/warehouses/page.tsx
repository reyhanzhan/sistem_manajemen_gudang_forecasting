'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Warehouse as WarehouseIcon, MapPin } from 'lucide-react';
import Header from '@/components/layout/Header';
import { warehousesApi } from '@/lib/api';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', code: '', address: '', city: '', province: '',
    phone: '', capacity: '',
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await warehousesApi.getAll();
      setWarehouses(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, capacity: parseInt(form.capacity) || 0 };
      if (editing) {
        await warehousesApi.update(editing.id, payload);
      } else {
        await warehousesApi.create(payload);
      }
      resetForm();
      load();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this warehouse?')) return;
    try { await warehousesApi.delete(id); load(); } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', code: '', address: '', city: '', province: '', phone: '', capacity: '' });
  };

  const edit = (wh: any) => {
    setEditing(wh);
    setForm({
      name: wh.name, code: wh.code, address: wh.address || '',
      city: wh.city || '', province: wh.province || '',
      phone: wh.phone || '', capacity: String(wh.capacity || ''),
    });
    setShowForm(true);
  };

  return (
    <div>
      <Header title="Warehouses" subtitle="Manage warehouse locations" />
      <div className="page-container">
        <div className="flex justify-end">
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Warehouse
          </button>
        </div>

        {showForm && (
          <div className="card border border-primary-200 bg-primary-50/30">
            <h3 className="text-base font-bold text-gray-900 mb-5">{editing ? 'Edit Warehouse' : 'New Warehouse'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Name *</label>
                <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Code *</label>
                <input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="input-label">City</label>
                <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Province</label>
                <input className="input-field" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Capacity</label>
                <input type="number" className="input-field" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="input-label">Address</label>
                <textarea className="input-field" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-5 pt-4 border-t border-primary-100">
              <button onClick={handleSave} className="btn-primary">Save</button>
              <button onClick={resetForm} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Warehouse Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card">
                  <div className="skeleton h-6 w-3/4 mb-3" />
                  <div className="skeleton h-4 w-1/2 mb-2" />
                  <div className="skeleton h-4 w-full" />
                </div>
              ))
            : warehouses.map((wh: any) => {
                const utilPercent = wh.capacity ? Math.min(100, ((wh._count?.inventories || 0) / wh.capacity) * 100) : 0;
                return (
                <div key={wh.id} className="card-hover group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl group-hover:scale-105 transition-transform">
                        <WarehouseIcon size={20} className="text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{wh.name}</h4>
                        <span className="text-xs font-mono text-gray-400">{wh.code}</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <button onClick={() => edit(wh)} className="btn-icon">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(wh.id)} className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="truncate">{wh.city || wh.address || 'No address'}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`badge ${wh.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {wh.status}
                    </span>
                    {wh.phone && <span className="text-xs text-gray-400">{wh.phone}</span>}
                  </div>
                  {wh.capacity && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500 font-medium">Capacity</span>
                        <span className="font-semibold text-gray-700">{wh._count?.inventories || 0} / {wh.capacity}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            utilPercent > 80 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                            utilPercent > 50 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                            'bg-gradient-to-r from-primary-500 to-primary-400'
                          }`}
                          style={{ width: `${utilPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}

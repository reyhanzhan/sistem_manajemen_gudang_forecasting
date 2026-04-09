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
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Warehouse
          </button>
        </div>

        {showForm && (
          <div className="card border-2 border-primary-200">
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit Warehouse' : 'New Warehouse'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <input className="input-field" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <input type="number" className="input-field" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea className="input-field" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} className="btn-primary">Save</button>
              <button onClick={resetForm} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Warehouse Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              ))
            : warehouses.map((wh: any) => (
                <div key={wh.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary-50 rounded-lg">
                        <WarehouseIcon size={20} className="text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{wh.name}</h4>
                        <span className="text-xs font-mono text-gray-500">{wh.code}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => edit(wh)} className="p-1.5 text-gray-400 hover:text-primary-600">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(wh.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                    <MapPin size={14} />
                    {wh.city || wh.address || 'No address'}
                  </div>
                  <span className={`badge ${wh.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                    {wh.status}
                  </span>
                  {wh.capacity && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Capacity</span>
                        <span>{wh._count?.inventories || 0} / {wh.capacity}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full"
                          style={{ width: `${Math.min(100, ((wh._count?.inventories || 0) / wh.capacity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus, ArrowLeftRight, CheckCircle, XCircle, Clock,
  ArrowDownToDot, ArrowUpFromDot, Repeat2,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { movementsApi, warehousesApi, productsApi } from '@/lib/api';

export default function MovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'STOCK_IN',
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    notes: '',
    lines: [{ productId: '', quantity: '' }],
  });

  useEffect(() => {
    loadRefs();
  }, []);

  useEffect(() => {
    loadMovements();
  }, [page, typeFilter, statusFilter]);

  const loadRefs = async () => {
    try {
      const [whRes, prodRes] = await Promise.all([
        warehousesApi.getAll(),
        productsApi.getAll({ limit: 200 }),
      ]);
      setWarehouses(whRes.data.data || []);
      setProducts(prodRes.data.data || []);
    } catch (err) { console.error(err); }
  };

  const loadMovements = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await movementsApi.getAll(params);
      setMovements(res.data.data || []);
      setMeta(res.data.meta || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addLine = () => setForm({
    ...form,
    lines: [...form.lines, { productId: '', quantity: '' }],
  });

  const removeLine = (index: number) => setForm({
    ...form,
    lines: form.lines.filter((_, i) => i !== index),
  });

  const updateLine = (index: number, key: string, value: string) => {
    const newLines = [...form.lines];
    (newLines[index] as any)[key] = value;
    setForm({ ...form, lines: newLines });
  };

  const handleCreate = async () => {
    try {
      const payload: any = {
        type: form.type,
        notes: form.notes || undefined,
        lines: form.lines.map((l) => ({
          productId: l.productId,
          quantity: parseInt(l.quantity),
        })),
      };
      if (form.type === 'STOCK_IN') {
        payload.destinationWarehouseId = form.destinationWarehouseId;
      } else if (form.type === 'STOCK_OUT') {
        payload.sourceWarehouseId = form.sourceWarehouseId;
      } else {
        payload.sourceWarehouseId = form.sourceWarehouseId;
        payload.destinationWarehouseId = form.destinationWarehouseId;
      }
      await movementsApi.create(payload);
      setShowForm(false);
      setForm({
        type: 'STOCK_IN', sourceWarehouseId: '', destinationWarehouseId: '',
        notes: '', lines: [{ productId: '', quantity: '' }],
      });
      loadMovements();
    } catch (err) { console.error(err); }
  };

  const handleApprove = async (id: string) => {
    try { await movementsApi.approve(id); loadMovements(); }
    catch (err) { console.error(err); }
  };

  const handleReject = async (id: string) => {
    try { await movementsApi.reject(id); loadMovements(); }
    catch (err) { console.error(err); }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'STOCK_IN': return <ArrowDownToDot size={14} className="text-green-600" />;
      case 'STOCK_OUT': return <ArrowUpFromDot size={14} className="text-red-600" />;
      case 'TRANSFER': return <Repeat2 size={14} className="text-blue-600" />;
      default: return <ArrowLeftRight size={14} />;
    }
  };

  return (
    <div>
      <Header title="Stock Movements" subtitle="Track inventory IN / OUT / Transfer operations" />
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-2">
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="input-field text-sm">
              <option value="">All Types</option>
              <option value="STOCK_IN">Stock In</option>
              <option value="STOCK_OUT">Stock Out</option>
              <option value="TRANSFER">Transfer</option>
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field text-sm">
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Movement
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="card border-2 border-primary-200">
            <h3 className="text-lg font-semibold mb-4">Create Stock Movement</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="STOCK_IN">Stock In</option>
                  <option value="STOCK_OUT">Stock Out</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>
              {(form.type === 'STOCK_OUT' || form.type === 'TRANSFER') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Warehouse *</label>
                  <select className="input-field" value={form.sourceWarehouseId} onChange={(e) => setForm({ ...form, sourceWarehouseId: e.target.value })}>
                    <option value="">Select...</option>
                    {warehouses.map((wh: any) => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                  </select>
                </div>
              )}
              {(form.type === 'STOCK_IN' || form.type === 'TRANSFER') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination Warehouse *</label>
                  <select className="input-field" value={form.destinationWarehouseId} onChange={(e) => setForm({ ...form, destinationWarehouseId: e.target.value })}>
                    <option value="">Select...</option>
                    {warehouses.map((wh: any) => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Lines */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
              {form.lines.map((line, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <select className="input-field flex-1" value={line.productId} onChange={(e) => updateLine(idx, 'productId', e.target.value)}>
                    <option value="">Select Product...</option>
                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                  </select>
                  <input type="number" placeholder="Qty" className="input-field w-24" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                  {form.lines.length > 1 && (
                    <button onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700 px-2">
                      <XCircle size={18} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addLine} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                + Add Item
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex gap-2">
              <button onClick={handleCreate} className="btn-primary">Submit</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Movements Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Reference</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">From</th>
                  <th className="table-header">To</th>
                  <th className="table-header">Items</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="table-cell"><div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" /></td>
                      ))}</tr>
                    ))
                  : movements.length === 0
                  ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">No movements found</td></tr>
                  : movements.map((mov: any) => (
                      <tr key={mov.id} className="hover:bg-gray-50">
                        <td className="table-cell font-mono text-sm">{mov.referenceNumber}</td>
                        <td className="table-cell">
                          <span className="flex items-center gap-1">
                            {typeIcon(mov.type)}
                            <span className="text-sm">{mov.type?.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="table-cell text-sm">{mov.sourceWarehouse?.name || '-'}</td>
                        <td className="table-cell text-sm">{mov.destinationWarehouse?.name || '-'}</td>
                        <td className="table-cell text-sm">{mov.lines?.length || 0} item(s)</td>
                        <td className="table-cell">
                          <span className={`badge ${
                            mov.status === 'COMPLETED' ? 'badge-success' :
                            mov.status === 'PENDING' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {mov.status}
                          </span>
                        </td>
                        <td className="table-cell text-sm text-gray-500">
                          {new Date(mov.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="table-cell">
                          {mov.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <button onClick={() => handleApprove(mov.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Approve">
                                <CheckCircle size={16} />
                              </button>
                              <button onClick={() => handleReject(mov.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Reject">
                                <XCircle size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1.5">Previous</button>
                <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="btn-secondary text-sm px-3 py-1.5">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

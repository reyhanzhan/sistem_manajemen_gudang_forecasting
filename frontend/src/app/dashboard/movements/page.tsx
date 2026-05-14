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
      <div className="page-container">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-2">
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="input-field text-sm w-auto">
              <option value="">All Types</option>
              <option value="STOCK_IN">Stock In</option>
              <option value="STOCK_OUT">Stock Out</option>
              <option value="TRANSFER">Transfer</option>
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field text-sm w-auto">
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
          <div className="card border border-primary-200 bg-primary-50/30">
            <h3 className="text-base font-bold text-gray-900 mb-5">Create Stock Movement</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div>
                <label className="input-label">Type *</label>
                <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="STOCK_IN">Stock In</option>
                  <option value="STOCK_OUT">Stock Out</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>
              {(form.type === 'STOCK_OUT' || form.type === 'TRANSFER') && (
                <div>
                  <label className="input-label">Source Warehouse *</label>
                  <select className="input-field" value={form.sourceWarehouseId} onChange={(e) => setForm({ ...form, sourceWarehouseId: e.target.value })}>
                    <option value="">Select...</option>
                    {warehouses.map((wh: any) => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                  </select>
                </div>
              )}
              {(form.type === 'STOCK_IN' || form.type === 'TRANSFER') && (
                <div>
                  <label className="input-label">Destination Warehouse *</label>
                  <select className="input-field" value={form.destinationWarehouseId} onChange={(e) => setForm({ ...form, destinationWarehouseId: e.target.value })}>
                    <option value="">Select...</option>
                    {warehouses.map((wh: any) => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Lines */}
            <div className="mb-5">
              <label className="input-label mb-2">Items</label>
              <div className="space-y-2">
                {form.lines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select className="input-field flex-1" value={line.productId} onChange={(e) => updateLine(idx, 'productId', e.target.value)}>
                      <option value="">Select Product...</option>
                      {products.map((p: any) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                    </select>
                    <input type="number" placeholder="Qty" className="input-field w-28" value={line.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                    {form.lines.length > 1 && (
                      <button onClick={() => removeLine(idx)} className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all">
                        <XCircle size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addLine} className="text-sm text-primary-600 hover:text-primary-700 font-semibold mt-2">
                + Add Item
              </button>
            </div>

            <div className="mb-5">
              <label className="input-label">Notes</label>
              <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex gap-3 pt-4 border-t border-primary-100">
              <button onClick={handleCreate} className="btn-primary">Submit</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Movements Table */}
        <div className="card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="table-header">Reference</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">From</th>
                  <th className="table-header">To</th>
                  <th className="table-header text-center">Items</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Date</th>
                  <th className="table-header text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="table-cell"><div className="skeleton h-4 w-3/4" /></td>
                      ))}</tr>
                    ))
                  : movements.length === 0
                  ? <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                      <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-40" />
                      <p className="font-medium">No movements found</p>
                    </td></tr>
                  : movements.map((mov: any) => (
                      <tr key={mov.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="table-cell font-mono text-xs font-semibold text-gray-800">{mov.referenceNumber}</td>
                        <td className="table-cell">
                          <span className="flex items-center gap-1.5">
                            {typeIcon(mov.type)}
                            <span className="text-sm font-medium">{mov.type?.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="table-cell text-sm text-gray-600">{mov.sourceWarehouse?.name || '-'}</td>
                        <td className="table-cell text-sm text-gray-600">{mov.destinationWarehouse?.name || '-'}</td>
                        <td className="table-cell text-center">
                          <span className="badge badge-neutral">{mov.lines?.length || 0}</span>
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${
                            mov.status === 'COMPLETED' ? 'badge-success' :
                            mov.status === 'PENDING' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {mov.status}
                          </span>
                        </td>
                        <td className="table-cell text-sm text-gray-400">
                          {new Date(mov.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="table-cell">
                          {mov.status === 'PENDING' && (
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => handleApprove(mov.id)} className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all" title="Approve">
                                <CheckCircle size={16} />
                              </button>
                              <button onClick={() => handleReject(mov.id)} className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-all" title="Reject">
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
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/40">
              <span className="text-sm text-gray-500">
                Page <span className="font-semibold text-gray-700">{meta.page}</span> of {meta.totalPages}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40">Previous</button>
                <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

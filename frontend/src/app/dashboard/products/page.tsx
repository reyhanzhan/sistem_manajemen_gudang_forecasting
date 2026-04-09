'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Package, Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import { productsApi } from '@/lib/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', sku: '', description: '', price: '', cost: '',
    minimumStock: '', unit: 'PCS', categoryId: '', weight: '',
  });

  useEffect(() => { loadProducts(); }, [page, search]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await productsApi.getAll({ page, limit: 10, search });
      setProducts(res.data.data || []);
      setMeta(res.data.meta || {});
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        cost: parseFloat(form.cost),
        minimumStock: parseInt(form.minimumStock),
        weight: form.weight ? parseFloat(form.weight) : undefined,
      };
      if (editingProduct) {
        await productsApi.update(editingProduct.id, payload);
      } else {
        await productsApi.create(payload);
      }
      resetForm();
      loadProducts();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productsApi.delete(id);
      loadProducts();
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setForm({ name: '', sku: '', description: '', price: '', cost: '', minimumStock: '', unit: 'PCS', categoryId: '', weight: '' });
  };

  const editProduct = (product: any) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      price: String(product.price),
      cost: String(product.cost),
      minimumStock: String(product.minimumStock),
      unit: product.unit,
      categoryId: product.categoryId || '',
      weight: product.weight ? String(product.weight) : '',
    });
    setShowForm(true);
  };

  return (
    <div>
      <Header title="Products" subtitle="Manage your product catalog" />
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search products..." className="input-field pl-10" />
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Product
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="card border-2 border-primary-200">
            <h3 className="text-lg font-semibold mb-4">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                <input className="input-field" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select className="input-field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option>PCS</option><option>KG</option><option>LITER</option><option>BOX</option><option>PACK</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (Rp) *</label>
                <input type="number" className="input-field" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost (Rp) *</label>
                <input type="number" className="input-field" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock *</label>
                <input type="number" className="input-field" value={form.minimumStock} onChange={(e) => setForm({ ...form, minimumStock: e.target.value })} />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="input-field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} className="btn-primary">Save Product</button>
              <button onClick={resetForm} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Product</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Category</th>
                  <th className="table-header text-right">Price</th>
                  <th className="table-header text-right">Cost</th>
                  <th className="table-header text-right">Min Stock</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" /></td>
                    ))}</tr>
                  ))
                ) : products.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">
                    <Package size={40} className="mx-auto mb-2 opacity-50" />No products found
                  </td></tr>
                ) : (
                  products.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{p.name}</td>
                      <td className="table-cell font-mono text-sm">{p.sku}</td>
                      <td className="table-cell text-sm">{p.category?.name || '-'}</td>
                      <td className="table-cell text-right">Rp {p.price?.toLocaleString('id-ID')}</td>
                      <td className="table-cell text-right">Rp {p.cost?.toLocaleString('id-ID')}</td>
                      <td className="table-cell text-right">{p.minimumStock}</td>
                      <td className="table-cell">
                        <span className={`badge ${p.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-1">
                          <button onClick={() => editProduct(p)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <span className="text-sm text-gray-500">
                Showing page {meta.page} of {meta.totalPages} ({meta.total} total)
              </span>
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

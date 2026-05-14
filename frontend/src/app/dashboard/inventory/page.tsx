'use client';

import React, { useEffect, useState } from 'react';
import {
  Package,
  AlertTriangle,
  Search,
  Filter,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { inventoryApi, warehousesApi } from '@/lib/api';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadInventory();
  }, [selectedWarehouse, search]);

  const loadData = async () => {
    try {
      const [whRes, alertRes] = await Promise.all([
        warehousesApi.getAll(),
        inventoryApi.getLowStock(),
      ]);
      setWarehouses(whRes.data.data || []);
      setLowStockAlerts(alertRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadInventory = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (selectedWarehouse) params.warehouseId = selectedWarehouse;
      if (search) params.search = search;
      const res = await inventoryApi.getAll(params);
      setInventory(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (item: any) => {
    if (item.quantity <= 0) return { label: 'Out of Stock', class: 'badge-danger' };
    if (item.quantity <= item.product?.minimumStock)
      return { label: 'Low Stock', class: 'badge-warning' };
    return { label: 'In Stock', class: 'badge-success' };
  };

  return (
    <div>
      <Header
        title="Inventory Management"
        subtitle="Monitor stock levels across all warehouses"
      />

      <div className="page-container">
        {/* Low Stock Alerts Banner */}
        {lowStockAlerts.length > 0 && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <span className="font-bold text-amber-800">
                {lowStockAlerts.length} Low Stock Alerts
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockAlerts.slice(0, 5).map((alert: any) => (
                <span
                  key={alert.id}
                  className="badge badge-warning"
                >
                  {alert.product?.name}: {alert.quantity} units
                </span>
              ))}
              {lowStockAlerts.length > 5 && (
                <span className="text-xs text-amber-600 font-medium">
                  +{lowStockAlerts.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="input-field pl-10"
              />
            </div>
            <div className="w-full md:w-64">
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="input-field"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((wh: any) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="table-header">Product</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Warehouse</th>
                  <th className="table-header text-right">Quantity</th>
                  <th className="table-header text-right">Min Stock</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="table-cell">
                          <div className="skeleton h-4 w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400">
                      <Package size={40} className="mx-auto mb-3 opacity-40" />
                      <p className="font-medium">No inventory records found</p>
                    </td>
                  </tr>
                ) : (
                  inventory.map((item: any) => {
                    const status = getStockStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="table-cell font-semibold text-gray-900">
                          {item.product?.name || '-'}
                        </td>
                        <td className="table-cell font-mono text-xs text-gray-500">
                          {item.product?.sku || '-'}
                        </td>
                        <td className="table-cell text-sm text-gray-600">
                          {item.warehouse?.name || '-'}
                        </td>
                        <td className="table-cell text-right font-bold text-gray-900">
                          {item.quantity?.toLocaleString()}
                        </td>
                        <td className="table-cell text-right text-gray-400">
                          {item.product?.minimumStock?.toLocaleString() || '-'}
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${status.class}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="table-cell text-right text-sm font-medium">
                          Rp {((item.quantity || 0) * (item.product?.price || 0)).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

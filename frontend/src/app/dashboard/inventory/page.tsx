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

      <div className="p-6 space-y-6">
        {/* Low Stock Alerts Banner */}
        {lowStockAlerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <span className="font-semibold text-amber-800">
                {lowStockAlerts.length} Low Stock Alerts
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockAlerts.slice(0, 5).map((alert: any) => (
                <span
                  key={alert.id}
                  className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded"
                >
                  {alert.product?.name}: {alert.quantity} units
                </span>
              ))}
              {lowStockAlerts.length > 5 && (
                <span className="text-xs text-amber-600">
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
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Product</th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Warehouse</th>
                  <th className="table-header text-right">Quantity</th>
                  <th className="table-header text-right">Min Stock</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="table-cell">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400">
                      <Package size={40} className="mx-auto mb-2 opacity-50" />
                      No inventory records found
                    </td>
                  </tr>
                ) : (
                  inventory.map((item: any) => {
                    const status = getStockStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="table-cell font-medium">
                          {item.product?.name || '-'}
                        </td>
                        <td className="table-cell font-mono text-sm">
                          {item.product?.sku || '-'}
                        </td>
                        <td className="table-cell text-sm">
                          {item.warehouse?.name || '-'}
                        </td>
                        <td className="table-cell text-right font-semibold">
                          {item.quantity?.toLocaleString()}
                        </td>
                        <td className="table-cell text-right text-gray-500">
                          {item.product?.minimumStock?.toLocaleString() || '-'}
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${status.class}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="table-cell text-right text-sm">
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

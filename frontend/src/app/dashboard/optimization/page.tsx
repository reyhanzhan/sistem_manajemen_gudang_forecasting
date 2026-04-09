'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  RefreshCw,
  CheckCircle,
  Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import Header from '@/components/layout/Header';
import StatCard from '@/components/ui/StatCard';
import { productsApi, optimizationApi } from '@/lib/api';

type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
};

export default function OptimizationPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [poResult, setPOResult] = useState<any>(null);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await productsApi.getAll({ limit: 100 });
      setProducts(res.data.data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const generatePO = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const res = await optimizationApi.generatePO({ productId: selectedProduct });
      setPOResult(res.data);
    } catch (error) {
      console.error('PO generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBulkPO = async () => {
    setBulkLoading(true);
    try {
      const res = await optimizationApi.bulkPO();
      setBulkResult(res.data);
    } catch (error) {
      console.error('Bulk PO failed:', error);
    } finally {
      setBulkLoading(false);
    }
  };

  const rec = poResult?.recommended;
  const demandStats = poResult?.demand_stats;

  // Cost comparison chart
  const costData = poResult?.supplier_options?.map((opt: any) => ({
    supplier: opt.supplier.name.slice(0, 20),
    orderCost: Math.round(opt.cost_analysis.annual_order_cost),
    holdingCost: Math.round(opt.cost_analysis.annual_holding_cost),
    purchaseCost: Math.round(opt.cost_analysis.annual_purchase_cost / 1000),
  })) || [];

  return (
    <div>
      <Header title="Auto-PO Generator" subtitle="AI-powered inventory optimization with Economic Order Quantity (EOQ)" />

      <div className="p-6 space-y-6">
        {/* Controls */}
        <div className="card">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="input w-full"
              >
                <option value="">-- Pilih Produk --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={generatePO}
              disabled={loading || !selectedProduct}
              className="btn-primary flex items-center gap-2"
            >
              <ShoppingCart size={16} />
              {loading ? 'Calculating...' : 'Generate PO'}
            </button>
            <button
              onClick={generateBulkPO}
              disabled={bulkLoading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw size={16} className={bulkLoading ? 'animate-spin' : ''} />
              {bulkLoading ? 'Processing...' : 'Bulk PO (All Products)'}
            </button>
          </div>
        </div>

        {/* Single Product PO Result */}
        {poResult && rec && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="EOQ (Order Qty)"
                value={rec.order_quantity}
                icon={Package}
                iconColor="bg-blue-100 text-blue-600"
                change={`Safety Stock: ${rec.safety_stock}`}
                changeType="neutral"
              />
              <StatCard
                title="Reorder Point"
                value={rec.reorder_point}
                icon={AlertTriangle}
                iconColor="bg-yellow-100 text-yellow-600"
                change={`Current Stock: ${poResult.current_stock}`}
                changeType={poResult.current_stock <= rec.reorder_point ? 'negative' : 'positive'}
              />
              <StatCard
                title="Daily Average Demand"
                value={demandStats?.daily_avg || 0}
                icon={TrendingUp}
                iconColor="bg-green-100 text-green-600"
                change={`Annual: ${Math.round(demandStats?.annual_demand || 0)}`}
                changeType="neutral"
              />
              <StatCard
                title="Total Annual Cost"
                value={`Rp ${Math.round(rec.total_cost).toLocaleString('id-ID')}`}
                icon={DollarSign}
                iconColor="bg-emerald-100 text-emerald-600"
              />
            </div>

            {/* Order Decision */}
            <div className={`card border-2 ${rec.should_order_now ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50'}`}>
              <div className="flex items-center gap-3">
                {rec.should_order_now ? (
                  <>
                    <AlertTriangle className="text-red-500" size={24} />
                    <div>
                      <h3 className="font-bold text-red-700">ORDER SEKARANG!</h3>
                      <p className="text-sm text-red-600">
                        Stok saat ini ({poResult.current_stock}) sudah di bawah Reorder Point ({rec.reorder_point}).
                        Pesan {rec.order_quantity} unit dari {rec.supplier?.name || 'supplier'}.
                        Urgency: <span className={`font-bold ${rec.urgency === 'CRITICAL' ? 'text-red-700' : 'text-orange-600'}`}>{rec.urgency}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="text-green-500" size={24} />
                    <div>
                      <h3 className="font-bold text-green-700">Stok Aman</h3>
                      <p className="text-sm text-green-600">
                        Stok saat ini ({poResult.current_stock}) masih di atas Reorder Point ({rec.reorder_point}).
                        Belum perlu memesan.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Supplier Options Table */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Supplier Options & Cost Analysis</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="table-header">Supplier</th>
                      <th className="table-header">Lead Time</th>
                      <th className="table-header">Unit Cost</th>
                      <th className="table-header">EOQ</th>
                      <th className="table-header">Safety Stock</th>
                      <th className="table-header">Stockout Risk</th>
                      <th className="table-header">Annual Cost</th>
                      <th className="table-header">Order?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(poResult.supplier_options || []).map((opt: any, i: number) => (
                      <tr key={i} className={`hover:bg-gray-50 ${i === 0 ? 'bg-blue-50' : ''}`}>
                        <td className="table-cell">
                          <div className="font-medium">{opt.supplier.name}</div>
                          {opt.supplier.is_primary && <span className="text-xs text-blue-600">Primary</span>}
                        </td>
                        <td className="table-cell">{opt.supplier.lead_time_days} days</td>
                        <td className="table-cell">Rp {opt.unit_cost.toLocaleString('id-ID')}</td>
                        <td className="table-cell font-semibold">{opt.eoq}</td>
                        <td className="table-cell">{opt.safety_stock}</td>
                        <td className="table-cell">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${URGENCY_COLORS[opt.stockout_risk.urgency as UrgencyLevel] || ''}`}>
                            {opt.stockout_risk.risk_percent}%
                          </span>
                        </td>
                        <td className="table-cell">Rp {Math.round(opt.cost_analysis.total_annual_cost).toLocaleString('id-ID')}</td>
                        <td className="table-cell">
                          {opt.should_order ? '🔴 Yes' : '🟢 No'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost Comparison Chart */}
            {costData.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Cost Breakdown by Supplier</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="supplier" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`} />
                    <Legend />
                    <Bar dataKey="orderCost" name="Order Cost" fill="#3b82f6" stackId="a" />
                    <Bar dataKey="holdingCost" name="Holding Cost" fill="#f59e0b" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* Bulk PO Results */}
        {bulkResult && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">
              Bulk PO Recommendations — {bulkResult.products_needing_reorder} / {bulkResult.total_products_analyzed} products need reorder
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="table-header">Product</th>
                    <th className="table-header">Current Stock</th>
                    <th className="table-header">EOQ</th>
                    <th className="table-header">Supplier</th>
                    <th className="table-header">Urgency</th>
                    <th className="table-header">Cost/Year</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(bulkResult.recommendations || []).map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="font-medium">{r.product.name}</div>
                        <div className="text-xs text-gray-500">{r.product.sku}</div>
                      </td>
                      <td className="table-cell">{r.current_stock}</td>
                      <td className="table-cell font-semibold">{r.recommended.order_quantity}</td>
                      <td className="table-cell">{r.recommended.supplier?.name}</td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${URGENCY_COLORS[r.recommended.urgency as UrgencyLevel] || ''}`}>
                          {r.recommended.urgency}
                        </span>
                      </td>
                      <td className="table-cell">Rp {Math.round(r.recommended.total_cost).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!poResult && !bulkResult && !loading && !bulkLoading && (
          <div className="card text-center py-12">
            <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">Auto-PO Generator</h3>
            <p className="text-sm text-gray-500 mt-1">
              Pilih produk dan klik &quot;Generate PO&quot; untuk menghitung Economic Order Quantity (EOQ) optimal
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

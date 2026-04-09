'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Package,
  Warehouse,
  ArrowLeftRight,
  AlertTriangle,
  TrendingUp,
  Truck,
  Clock,
  DollarSign,
  Wifi,
  WifiOff,
  Activity,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  Treemap,
  AreaChart, Area,
} from 'recharts';
import Header from '@/components/layout/Header';
import StatCard from '@/components/ui/StatCard';
import { dashboardApi } from '@/lib/api';
import { useDashboardRefresh, useSocket } from '@/lib/socket';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Heatmap color based on stock velocity
function getHeatColor(value: number, max: number): string {
  const ratio = max > 0 ? value / max : 0;
  if (ratio > 0.8) return '#ef4444'; // hot - fast moving
  if (ratio > 0.6) return '#f97316';
  if (ratio > 0.4) return '#f59e0b';
  if (ratio > 0.2) return '#84cc16';
  return '#22c55e'; // cold - slow moving
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [warehouseUtil, setWarehouseUtil] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const { socket } = useSocket();

  const loadDashboard = useCallback(async () => {
    try {
      const [overviewRes, trendsRes, utilRes, topRes] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getMovementTrends(30),
        dashboardApi.getWarehouseUtilization(),
        dashboardApi.getTopProducts(10),
      ]);
      setOverview(overviewRes.data);
      setTrends(trendsRes.data);
      setWarehouseUtil(utilRes.data);
      setTopProducts(topRes.data || []);
      setLastUpdate(new Date().toLocaleTimeString('id-ID'));
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Real-time WebSocket updates
  useDashboardRefresh(loadDashboard);

  useEffect(() => {
    if (socket) {
      const onConnect = () => setIsConnected(true);
      const onDisconnect = () => setIsConnected(false);
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      setIsConnected(socket.connected);
      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      };
    }
  }, [socket]);

  const counts = overview?.counts || {};
  const stats = overview?.inventoryStats || {};

  // Prepare heatmap data - product velocity treemap
  const heatmapData = topProducts.map((p: any) => ({
    name: p.product?.name || 'Unknown',
    size: p.totalQuantity || 0,
    sku: p.product?.sku || '',
  }));

  const maxVolume = Math.max(...heatmapData.map((d: any) => d.size), 1);

  // Custom treemap content
  const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, size } = props;
    if (width < 30 || height < 20) return null;
    return (
      <g>
        <rect
          x={x} y={y} width={width} height={height}
          fill={getHeatColor(size, maxVolume)}
          stroke="#fff" strokeWidth={2}
          rx={4}
        />
        {width > 50 && height > 30 && (
          <>
            <text x={x + 6} y={y + 16} fontSize={11} fill="#fff" fontWeight="bold">
              {name?.slice(0, Math.floor(width / 7)) || ''}
            </text>
            <text x={x + 6} y={y + 30} fontSize={10} fill="rgba(255,255,255,0.8)">
              {size} units
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Overview of your warehouse operations"
      />

      <div className="p-6 space-y-6">
        {/* Real-time Status Bar */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <><Wifi size={14} className="text-green-500" /> <span className="text-green-600">Real-time connected</span></>
            ) : (
              <><WifiOff size={14} className="text-gray-400" /> <span>Connecting...</span></>
            )}
          </div>
          {lastUpdate && <span>Last updated: {lastUpdate}</span>}
        </div>

        {/* ─── Stat Cards ────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Products"
            value={counts.activeProducts || 0}
            icon={Package}
            change={`${counts.totalProducts || 0} total`}
            changeType="neutral"
          />
          <StatCard
            title="Warehouses"
            value={counts.totalWarehouses || 0}
            icon={Warehouse}
            iconColor="bg-green-100 text-green-600"
          />
          <StatCard
            title="Pending Movements"
            value={counts.pendingMovements || 0}
            icon={Clock}
            iconColor="bg-yellow-100 text-yellow-600"
            change="Awaiting approval"
            changeType="neutral"
          />
          <StatCard
            title="Low Stock Alerts"
            value={stats.lowStockCount || 0}
            icon={AlertTriangle}
            iconColor="bg-red-100 text-red-600"
            change={`${stats.outOfStockCount || 0} out of stock`}
            changeType="negative"
          />
        </div>

        {/* ─── Second Row Stats ──────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Inventory Value"
            value={`Rp ${(stats.totalValue || 0).toLocaleString('id-ID')}`}
            icon={DollarSign}
            iconColor="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            title="Active Suppliers"
            value={counts.totalSuppliers || 0}
            icon={Truck}
            iconColor="bg-purple-100 text-purple-600"
          />
          <StatCard
            title="Total Movements"
            value={counts.totalMovements || 0}
            icon={ArrowLeftRight}
            iconColor="bg-blue-100 text-blue-600"
          />
        </div>

        {/* ─── Charts Row ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Movement Trends - Area Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity size={18} />
              Movement Trends (30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends.slice(-14)}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="STOCK_IN" name="Stock In" stroke="#10b981" fill="url(#colorIn)" />
                <Area type="monotone" dataKey="STOCK_OUT" name="Stock Out" stroke="#ef4444" fill="url(#colorOut)" />
                <Area type="monotone" dataKey="TRANSFER" name="Transfer" stroke="#3b82f6" fill="#3b82f620" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Warehouse Utilization */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Warehouse Utilization</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={warehouseUtil}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="totalStock"
                  nameKey="name"
                  label={({ name, utilizationPercent }) =>
                    `${name}: ${utilizationPercent}%`
                  }
                >
                  {warehouseUtil.map((_: any, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─── Product Velocity Heatmap ──────────────── */}
        {heatmapData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Product Velocity Heatmap</h3>
            <p className="text-sm text-gray-500 mb-4">
              Area menunjukkan volume pergerakan barang. Merah = Fast-moving, Hijau = Slow-moving
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={heatmapData}
                dataKey="size"
                aspectRatio={4 / 3}
                content={<CustomTreemapContent />}
              />
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 justify-center text-xs text-gray-600">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#ef4444' }} /> Hot (Fast-moving)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#f59e0b' }} /> Warm</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#22c55e' }} /> Cold (Slow-moving)</span>
            </div>
          </div>
        )}

        {/* ─── Recent Movements ──────────────────────── */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Movements</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-header">Reference</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">From / To</th>
                  <th className="table-header">Created By</th>
                  <th className="table-header">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(overview?.recentMovements || []).map((mov: any) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-sm">
                      {mov.referenceNumber}
                    </td>
                    <td className="table-cell">
                      <span
                        className={`badge ${
                          mov.type === 'STOCK_IN'
                            ? 'badge-success'
                            : mov.type === 'STOCK_OUT'
                            ? 'badge-danger'
                            : 'badge-info'
                        }`}
                      >
                        {mov.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span
                        className={`badge ${
                          mov.status === 'COMPLETED'
                            ? 'badge-success'
                            : mov.status === 'PENDING'
                            ? 'badge-warning'
                            : 'badge-danger'
                        }`}
                      >
                        {mov.status}
                      </span>
                    </td>
                    <td className="table-cell text-sm">
                      {mov.sourceWarehouse?.code || '-'} → {mov.destinationWarehouse?.code || '-'}
                    </td>
                    <td className="table-cell text-sm">
                      {mov.createdBy?.firstName} {mov.createdBy?.lastName}
                    </td>
                    <td className="table-cell text-sm text-gray-500">
                      {new Date(mov.createdAt).toLocaleDateString('id-ID')}
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

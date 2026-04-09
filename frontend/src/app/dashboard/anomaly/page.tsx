'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  TrendingDown,
  Search,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';
import Header from '@/components/layout/Header';
import StatCard from '@/components/ui/StatCard';
import { anomalyApi } from '@/lib/api';

const RISK_COLORS: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

export default function AnomalyPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [daysBack, setDaysBack] = useState(90);

  const runDetection = async () => {
    setLoading(true);
    try {
      const res = await anomalyApi.detect(daysBack);
      setResult(res.data);
    } catch (error) {
      console.error('Anomaly detection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const summary = result?.summary || {};
  const anomalies = result?.anomalies || [];

  // Prepare scatter chart data (hour vs quantity)
  const scatterData = anomalies.map((a: any) => ({
    hour: a.hour,
    quantity: a.quantity,
    score: Math.abs(a.anomaly_score),
    risk: a.risk_level,
    name: a.product_name,
  }));

  // Prepare reason distribution
  const reasonCounts: Record<string, number> = {};
  anomalies.forEach((a: any) => {
    a.reasons.forEach((r: string) => {
      const key = r.split('(')[0].trim();
      reasonCounts[key] = (reasonCounts[key] || 0) + 1;
    });
  });
  const reasonData = Object.entries(reasonCounts).map(([reason, count]) => ({
    reason,
    count,
  }));

  return (
    <div>
      <Header title="Anomaly Detection" subtitle="AI-powered fraud & error detection using Isolation Forest" />

      <div className="p-6 space-y-6">
        {/* Controls */}
        <div className="card flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Period</label>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="input w-40"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>
          <button
            onClick={runDetection}
            disabled={loading}
            className="btn-primary mt-5 flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Analyzing...' : 'Run Detection'}
          </button>
        </div>

        {result && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Transactions"
                value={summary.total_transactions || 0}
                icon={Search}
                iconColor="bg-blue-100 text-blue-600"
              />
              <StatCard
                title="Anomalies Detected"
                value={summary.anomalies_detected || 0}
                icon={ShieldAlert}
                iconColor="bg-red-100 text-red-600"
                change={`${summary.anomaly_rate || 0}% anomaly rate`}
                changeType="negative"
              />
              <StatCard
                title="High Risk"
                value={summary.high_risk || 0}
                icon={AlertTriangle}
                iconColor="bg-red-100 text-red-600"
              />
              <StatCard
                title="Suspicious Hour"
                value={summary.suspicious_hour_anomalies || 0}
                icon={Clock}
                iconColor="bg-yellow-100 text-yellow-600"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Anomaly Scatter Plot */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Anomaly Distribution (Hour vs Quantity)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="hour" name="Hour" domain={[0, 23]} />
                    <YAxis type="number" dataKey="quantity" name="Quantity" />
                    <ZAxis type="number" dataKey="score" range={[50, 400]} name="Score" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={scatterData}>
                      {scatterData.map((entry: any, index: number) => (
                        <Cell key={index} fill={RISK_COLORS[entry.risk] || '#6b7280'} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2 justify-center text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> High Risk</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Medium</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> Low</span>
                </div>
              </div>

              {/* Reason Distribution */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Anomaly Reasons</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reasonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="reason" width={150} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Anomaly Table */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Detected Anomalies</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="table-header">Reference</th>
                      <th className="table-header">Type</th>
                      <th className="table-header">Product</th>
                      <th className="table-header">User</th>
                      <th className="table-header">Qty</th>
                      <th className="table-header">Time</th>
                      <th className="table-header">Risk</th>
                      <th className="table-header">Reasons</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {anomalies.map((anomaly: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="table-cell font-mono text-xs">{anomaly.reference_number}</td>
                        <td className="table-cell">
                          <span className={`badge ${anomaly.movement_type === 'STOCK_OUT' ? 'badge-danger' : 'badge-info'}`}>
                            {anomaly.movement_type}
                          </span>
                        </td>
                        <td className="table-cell text-sm">{anomaly.product_name}</td>
                        <td className="table-cell text-sm">{anomaly.user_name}</td>
                        <td className="table-cell font-semibold">{anomaly.quantity}</td>
                        <td className="table-cell text-sm">
                          {new Date(anomaly.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="table-cell">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              anomaly.risk_level === 'HIGH' ? 'bg-red-100 text-red-700' :
                              anomaly.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}
                          >
                            {anomaly.risk_level}
                          </span>
                        </td>
                        <td className="table-cell text-xs text-gray-600">{anomaly.reasons.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!result && !loading && (
          <div className="card text-center py-12">
            <ShieldAlert size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">Anomaly Detection</h3>
            <p className="text-sm text-gray-500 mt-1">
              Klik &quot;Run Detection&quot; untuk menganalisis transaksi mencurigakan menggunakan Isolation Forest AI
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

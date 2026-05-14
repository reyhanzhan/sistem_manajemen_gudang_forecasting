'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Brain,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Legend,
} from 'recharts';
import Header from '@/components/layout/Header';
import { forecastApi, productsApi } from '@/lib/api';

export default function ForecastPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [periodDays, setPeriodDays] = useState(30);
  const [forecast, setForecast] = useState<any>(null);
  const [aiHealth, setAiHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [productsRes, healthRes] = await Promise.all([
        productsApi.getAll({ limit: 100 }),
        forecastApi.health(),
      ]);
      setProducts(productsRes.data.data || []);
      setAiHealth(healthRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const runForecast = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      const response = await forecastApi.predict(selectedProduct, undefined, periodDays);
      setForecast(response.data);
    } catch (error) {
      console.error('Forecast failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const trainModel = async () => {
    setTraining(true);
    try {
      await forecastApi.train();
      const healthRes = await forecastApi.health();
      setAiHealth(healthRes.data);
    } catch (error) {
      console.error('Training failed:', error);
    } finally {
      setTraining(false);
    }
  };

  // Prepare chart data from daily predictions
  const chartData = forecast?.daily_predictions?.map((pred: number, idx: number) => {
    const date = new Date();
    date.setDate(date.getDate() + idx + 1);
    return {
      date: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      predicted: pred,
      upper: pred * 1.3,
      lower: Math.max(0, pred * 0.7),
    };
  }) || [];

  return (
    <div>
      <Header
        title="AI Demand Forecasting"
        subtitle="Machine learning-powered demand prediction and reorder suggestions"
      />

      <div className="page-container">
        {/* ─── AI Service Status ──────────────────────── */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${
            aiHealth?.status === 'healthy'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {aiHealth?.status === 'healthy' ? (
              <CheckCircle size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            <span className="text-sm font-medium">
              AI Service: {aiHealth?.status || 'Unknown'}
            </span>
            {aiHealth?.model_version && (
              <span className="text-xs opacity-60">
                (Model: {aiHealth.model_version})
              </span>
            )}
          </div>

          <button
            onClick={trainModel}
            disabled={training}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={16} className={training ? 'animate-spin' : ''} />
            {training ? 'Training...' : 'Retrain Model'}
          </button>
        </div>

        {/* ─── Forecast Controls ─────────────────────── */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100">
              <Brain size={18} className="text-primary-600" />
            </div>
            Generate Forecast
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="input-label">Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="input-field"
              >
                <option value="">Select a product...</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Forecast Period (Days)</label>
              <select
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value))}
                className="input-field"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={runForecast}
                disabled={loading || !selectedProduct}
                className="btn-primary flex items-center gap-2 w-full justify-center py-2.5"
              >
                {loading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <TrendingUp size={16} />
                )}
                {loading ? 'Generating...' : 'Run Forecast'}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Forecast Results ──────────────────────── */}
        {forecast && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card-hover text-center">
                <p className="text-sm text-gray-500 mb-1">Predicted Demand</p>
                <p className="text-3xl font-bold text-primary-600">
                  {Math.round(forecast.predicted_demand)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  units in {forecast.period_days} days
                </p>
              </div>
              <div className="card-hover text-center">
                <p className="text-sm text-gray-500 mb-1">Daily Average</p>
                <p className="text-3xl font-bold text-primary-500">
                  {forecast.daily_average?.toFixed(1)}
                </p>
                <p className="text-xs text-gray-400 mt-1">units/day</p>
              </div>
              <div className="card-hover text-center">
                <p className="text-sm text-gray-500 mb-1">Current Stock</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {forecast.current_stock}
                </p>
                <p className="text-xs text-gray-400 mt-1">units available</p>
              </div>
              <div className="card-hover text-center">
                <p className="text-sm text-gray-500 mb-1">Suggested Reorder</p>
                <p className={`text-3xl font-bold ${
                  forecast.suggested_reorder > 0 ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {forecast.suggested_reorder}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {forecast.suggested_reorder > 0 ? 'units to order' : 'stock sufficient'}
                </p>
              </div>
            </div>

            {/* Confidence Interval */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100">
                  <BarChart3 size={16} className="text-primary-600" />
                </div>
                Confidence Range (95%)
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Lower bound:</span>
                  <span className="font-bold text-gray-900">
                    {Math.round(forecast.confidence_lower)} units
                  </span>
                </div>
                <span className="text-gray-200">|</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Upper bound:</span>
                  <span className="font-bold text-gray-900">
                    {Math.round(forecast.confidence_upper)} units
                  </span>
                </div>
              </div>
            </div>

            {/* Prediction Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">
                Daily Demand Forecast
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="upper"
                    name="Upper Bound"
                    stroke="none"
                    fill="#e0e7ff"
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    name="Lower Bound"
                    stroke="none"
                    fill="#ffffff"
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted Demand"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#6366f1' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Model Metrics */}
            {forecast.model_metrics && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Model Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-gray-50/80 rounded-xl p-4">
                  <div>
                    <span className="text-gray-500">Model:</span>
                    <span className="ml-2 font-medium">
                      {forecast.model_metrics.best_model || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">MAE:</span>
                    <span className="ml-2 font-medium">
                      {forecast.model_metrics.mae?.toFixed(4) || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">RMSE:</span>
                    <span className="ml-2 font-medium">
                      {forecast.model_metrics.rmse?.toFixed(4) || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">R² Score:</span>
                    <span className="ml-2 font-medium">
                      {forecast.model_metrics.r2_score?.toFixed(4) || 'N/A'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Version: {forecast.model_version}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

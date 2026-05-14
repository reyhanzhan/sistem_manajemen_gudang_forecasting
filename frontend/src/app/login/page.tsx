'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Warehouse, LogIn, Eye, EyeOff, Shield, Zap, BarChart3 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('admin@wms.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authApi.login(email, password);
      const { accessToken, user } = response.data;
      login(accessToken, user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: BarChart3, label: 'AI-Powered Forecasting', desc: 'Prophet & Machine Learning' },
    { icon: Shield, label: 'Anomaly Detection', desc: 'Real-time fraud prevention' },
    { icon: Zap, label: 'Auto Purchase Orders', desc: 'EOQ-based optimization' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* ─── Left Panel - Branding ─────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-12 flex-col justify-between overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-32 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10">
              <Warehouse className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">SmartWMS</h1>
              <p className="text-primary-300 text-xs font-medium">Enterprise Edition</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              AI-Powered<br />Warehouse<br />Management
            </h2>
            <p className="text-primary-200/80 text-lg max-w-md leading-relaxed">
              Intelligent inventory optimization with predictive analytics, real-time monitoring, and automated decision making.
            </p>
          </div>

          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-4 group">
                <div className="w-11 h-11 rounded-xl bg-white/[0.08] backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-white/[0.15] transition-colors">
                  <f.icon size={20} className="text-primary-300" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{f.label}</p>
                  <p className="text-primary-400 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-primary-400/60 text-xs">
            &copy; 2024 SmartWMS. Built with Next.js, NestJS & Python AI.
          </p>
        </div>
      </div>

      {/* ─── Right Panel - Login Form ──────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gray-50/80">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-11 h-11 bg-primary-600 rounded-2xl flex items-center justify-center">
              <Warehouse className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SmartWMS</h1>
              <p className="text-gray-500 text-xs">Enterprise Edition</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-1.5">Enter your credentials to access the dashboard</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 animate-slide-up">
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="name@company.com"
                required
              />
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-[15px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-gray-50/80 px-3 text-gray-400 font-medium">Demo Accounts</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Admin', email: 'admin@wms.com', color: 'from-primary-500 to-primary-600' },
                { label: 'Manager', email: 'manager@wms.com', color: 'from-violet-500 to-violet-600' },
                { label: 'Staff', email: 'staff@wms.com', color: 'from-emerald-500 to-emerald-600' },
              ].map((demo) => (
                <button
                  key={demo.email}
                  onClick={() => { setEmail(demo.email); setPassword('password123'); }}
                  className="group relative bg-white border border-gray-200 rounded-xl p-3 text-center hover:border-primary-300 hover:shadow-sm transition-all duration-200"
                >
                  <div className={`w-8 h-8 mx-auto mb-1.5 rounded-lg bg-gradient-to-br ${demo.color} flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold">{demo.label[0]}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{demo.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Warehouse, LogIn } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('admin@wms.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Warehouse className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white">WMS</h1>
          <p className="text-primary-200 mt-1">
            AI-Powered Warehouse Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Sign in to your account
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Demo Credentials:</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => { setEmail('admin@wms.com'); setPassword('password123'); }}
                className="bg-gray-50 p-2 rounded text-center hover:bg-gray-100"
              >
                <span className="font-medium">Admin</span>
              </button>
              <button
                onClick={() => { setEmail('manager@wms.com'); setPassword('password123'); }}
                className="bg-gray-50 p-2 rounded text-center hover:bg-gray-100"
              >
                <span className="font-medium">Manager</span>
              </button>
              <button
                onClick={() => { setEmail('staff@wms.com'); setPassword('password123'); }}
                className="bg-gray-50 p-2 rounded text-center hover:bg-gray-100"
              >
                <span className="font-medium">Staff</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

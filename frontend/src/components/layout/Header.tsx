'use client';

import React from 'react';
import { Bell, Search, ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const { user } = useAuthStore();
  const pathname = usePathname();

  // Build breadcrumbs
  const segments = pathname.split('/').filter(Boolean).slice(1); // remove leading 'dashboard'
  const breadcrumbs = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    isLast: i === segments.length - 1,
  }));

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs text-gray-400 font-medium">Dashboard</span>
                {breadcrumbs.map((bc, i) => (
                  <React.Fragment key={i}>
                    <ChevronRight size={11} className="text-gray-300" />
                    <span className={`text-xs font-medium ${bc.isLast ? 'text-primary-600' : 'text-gray-400'}`}>
                      {bc.label}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {actions}

            {/* Search */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search..."
                className="w-56 pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200 group">
              <Bell size={19} className="text-gray-500 group-hover:text-gray-700" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-200 hidden sm:block" />

            {/* User Avatar */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-primary-200">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] text-gray-400 font-medium">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

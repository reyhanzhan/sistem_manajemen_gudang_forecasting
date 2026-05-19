'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowLeftRight,
  TrendingUp,
  Bell,
  Users,
  Truck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  BoxesIcon,
  ShieldAlert,
  ShoppingCart,
  ScanBarcode,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const menuSections = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Inventory', href: '/dashboard/inventory', icon: BoxesIcon },
      { name: 'Products', href: '/dashboard/products', icon: Package },
      { name: 'Warehouses', href: '/dashboard/warehouses', icon: Warehouse },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Movements', href: '/dashboard/movements', icon: ArrowLeftRight },
      { name: 'Suppliers', href: '/dashboard/suppliers', icon: Truck },
      { name: 'Scanner', href: '/dashboard/scanner', icon: ScanBarcode },
    ],
  },
  {
    label: 'AI & Analytics',
    items: [
      { name: 'Forecasting', href: '/dashboard/forecast', icon: TrendingUp },
      { name: 'Auto-PO', href: '/dashboard/optimization', icon: ShoppingCart },
      { name: 'Anomaly', href: '/dashboard/anomaly', icon: ShieldAlert },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
  },
];

const adminItems = [
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-sidebar via-sidebar to-[#0a0920] text-white transition-all duration-300 z-50 flex flex-col ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/[0.06]">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Warehouse size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight">SmartWMS</h1>
              <p className="text-[10px] text-gray-500 font-medium">Enterprise v2.0</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 mx-auto bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <Warehouse size={18} className="text-white" />
          </div>
        )}
      </div>

      {/* Toggle - subtle, outside the header */}
      <button
        onClick={() => onCollapsedChange(!collapsed)}
        className="absolute -right-3 top-[68px] w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors z-50"
      >
        {collapsed ? (
          <ChevronRight size={12} className="text-gray-600" />
        ) : (
          <ChevronLeft size={12} className="text-gray-600" />
        )}
      </button>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin space-y-5">
        {menuSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 px-3">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                      isActive
                        ? 'bg-primary-600/90 text-white shadow-lg shadow-primary-600/20'
                        : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-300 rounded-r-full" />
                    )}
                    <item.icon size={19} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} />
                    {!collapsed && (
                      <span className="text-[13px] font-medium">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Admin section */}
        {user?.role === 'ADMIN' && (
          <div>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 px-3">
                Admin
              </p>
            )}
            <div className="space-y-0.5">
              {adminItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                      isActive
                        ? 'bg-primary-600/90 text-white shadow-lg shadow-primary-600/20'
                        : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-300 rounded-r-full" />
                    )}
                    <item.icon size={19} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'} />
                    {!collapsed && <span className="text-[13px] font-medium">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User Info */}
      <div className="border-t border-white/[0.06] p-4">
        {!collapsed && user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-primary-500/15">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-gray-500 font-medium">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 text-sm ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-[13px] font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}

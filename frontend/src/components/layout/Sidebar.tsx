'use client';

import React, { useState } from 'react';
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

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', href: '/dashboard/inventory', icon: BoxesIcon },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Warehouses', href: '/dashboard/warehouses', icon: Warehouse },
  { name: 'Movements', href: '/dashboard/movements', icon: ArrowLeftRight },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: Truck },
  { name: 'Forecasting', href: '/dashboard/forecast', icon: TrendingUp },
  { name: 'Auto-PO', href: '/dashboard/optimization', icon: ShoppingCart },
  { name: 'Anomaly Detection', href: '/dashboard/anomaly', icon: ShieldAlert },
  { name: 'Barcode Scanner', href: '/dashboard/scanner', icon: ScanBarcode },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
];

const adminMenu = [
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const allMenuItems = [
    ...menuItems,
    ...(user?.role === 'ADMIN' ? adminMenu : []),
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar text-white transition-all duration-300 z-50 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold">WMS</h1>
            <p className="text-xs text-gray-400">Warehouse Management</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-sidebar-hover"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        {allMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {!collapsed && <span className="text-sm">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t border-gray-700 p-4">
        {!collapsed && user && (
          <div className="mb-3">
            <p className="text-sm font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-400">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm w-full"
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

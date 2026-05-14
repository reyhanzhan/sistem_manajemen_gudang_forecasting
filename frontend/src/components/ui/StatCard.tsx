'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
}

export default function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'bg-primary-50 text-primary-600',
}: StatCardProps) {
  const changeConfig = {
    positive: { color: 'text-emerald-600 bg-emerald-50', icon: TrendingUp },
    negative: { color: 'text-red-600 bg-red-50', icon: TrendingDown },
    neutral: { color: 'text-gray-500 bg-gray-50', icon: Minus },
  };

  const cfg = changeConfig[changeType];

  return (
    <div className="card-hover group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-gray-500 mb-2">{title}</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
          {change && (
            <div className={`inline-flex items-center gap-1 mt-2.5 px-2 py-0.5 rounded-md text-xs font-semibold ${cfg.color}`}>
              <cfg.icon size={12} />
              {change}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-2xl ${iconColor} transition-transform duration-300 group-hover:scale-110`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

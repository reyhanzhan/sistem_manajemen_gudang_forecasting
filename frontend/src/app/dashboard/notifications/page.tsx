'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import { notificationsApi } from '@/lib/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      const unreadOnly = filter === 'unread';
      const res = await notificationsApi.getAll({ unread: unreadOnly });
      setNotifications(res.data.data || res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const markRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      load();
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      load();
    } catch (err) { console.error(err); }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'border-l-red-500 bg-red-50';
      case 'HIGH': return 'border-l-orange-500 bg-orange-50';
      case 'MEDIUM': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <div>
      <Header title="Notifications" subtitle="System alerts and updates" />
      <div className="page-container">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button onClick={() => setFilter('all')} className={`px-4 py-2.5 text-sm rounded-xl font-medium transition-all ${filter === 'all' ? 'bg-primary-100 text-primary-700 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              All
            </button>
            <button onClick={() => setFilter('unread')} className={`px-4 py-2.5 text-sm rounded-xl font-medium flex items-center gap-1.5 transition-all ${filter === 'unread' ? 'bg-primary-100 text-primary-700 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              Unread
              {unreadCount > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{unreadCount}</span>}
            </button>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-1.5">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card">
                <div className="skeleton h-5 w-1/3 mb-2" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            ))
          ) : notifications.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Bell size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No notifications</p>
              <p className="text-sm mt-1">You&apos;re all caught up!</p>
            </div>
          ) : (
            notifications.map((notif: any) => (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border-l-4 transition-all ${
                  notif.isRead ? 'bg-white border-l-gray-200' : getPriorityColor(notif.priority)
                } ${!notif.isRead ? 'shadow-sm' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                        notif.type === 'LOW_STOCK' ? 'bg-amber-100 text-amber-700' :
                        notif.type === 'MOVEMENT_APPROVED' ? 'bg-green-100 text-green-700' :
                        notif.type === 'SYSTEM' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {notif.type?.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(notif.createdAt).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <h4 className={`font-medium ${notif.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                      {notif.title}
                    </h4>
                    <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                  </div>
                  {!notif.isRead && (
                    <button onClick={() => markRead(notif.id)} className="ml-4 p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors" title="Mark as read">
                      <Check size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/layout/PWARegister';

export const metadata: Metadata = {
  title: 'WMS - Warehouse Management System',
  description: 'AI-Powered Warehouse Management System with Demand Forecasting',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WMS',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ScanBarcode,
  Camera,
  X,
  Package,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { productsApi } from '@/lib/api';

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scannedCode, setScannedCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState('');
  const [scanHistory, setScanHistory] = useState<any[]>([]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setScanning(true);
      setError('');
    } catch (err) {
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setScanning(false);
  }, [stream]);

  // Capture frame for barcode detection
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Use BarcodeDetector API if available (Chrome/Edge)
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
      });
      const imageData = canvas.toDataURL('image/png');
      const img = new Image();
      img.onload = async () => {
        try {
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            handleBarcodeScan(code);
          }
        } catch {
          // continue scanning
        }
      };
      img.src = imageData;
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (scanning) {
      interval = setInterval(captureFrame, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanning, captureFrame]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleBarcodeScan = async (code: string) => {
    if (code === scannedCode) return; // prevent duplicate scans
    setScannedCode(code);
    stopCamera();
    await lookupProduct(code);
  };

  const lookupProduct = async (code: string) => {
    setError('');
    setProduct(null);
    try {
      const res = await productsApi.getAll({ search: code, limit: 1 });
      const products = res.data.data || [];
      if (products.length > 0) {
        const found = products[0];
        setProduct(found);
        setScanHistory((prev) => [
          { code, product: found, time: new Date().toLocaleTimeString('id-ID') },
          ...prev.slice(0, 19),
        ]);
      } else {
        setError(`Produk dengan kode "${code}" tidak ditemukan`);
      }
    } catch {
      setError('Gagal mencari produk');
    }
  };

  const handleManualSearch = () => {
    if (manualCode.trim()) {
      setScannedCode(manualCode.trim());
      lookupProduct(manualCode.trim());
    }
  };

  return (
    <div>
      <Header title="Barcode Scanner" subtitle="Scan barcode menggunakan kamera HP untuk identifikasi produk" />

      <div className="p-6 space-y-6">
        {/* Scanner Controls */}
        <div className="card">
          <div className="flex flex-wrap items-end gap-4">
            {!scanning ? (
              <button onClick={startCamera} className="btn-primary flex items-center gap-2">
                <Camera size={18} />
                Buka Kamera
              </button>
            ) : (
              <button onClick={stopCamera} className="btn-danger flex items-center gap-2">
                <X size={18} />
                Tutup Kamera
              </button>
            )}

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Input Manual (SKU / Barcode)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                  placeholder="Masukkan SKU atau kode barcode..."
                  className="input flex-1"
                />
                <button onClick={handleManualSearch} className="btn-secondary">
                  <ScanBarcode size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Camera View */}
        {scanning && (
          <div className="card">
            <div className="relative max-w-lg mx-auto">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg"
              />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-primary-500 rounded-lg">
                  <div className="w-full h-0.5 bg-primary-500 animate-pulse mt-16" />
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                Arahkan kamera ke barcode produk
              </p>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Error */}
        {error && (
          <div className="card bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Product Result */}
        {product && (
          <div className="card border-2 border-green-400 bg-green-50">
            <div className="flex items-start gap-4">
              <CheckCircle className="text-green-500 mt-1" size={24} />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-800">Produk Ditemukan</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">SKU</p>
                    <p className="font-mono font-semibold">{product.sku}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Nama</p>
                    <p className="font-semibold">{product.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Unit</p>
                    <p>{product.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Harga</p>
                    <p className="font-semibold">Rp {Number(product.unitPrice).toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Min Stock</p>
                    <p>{product.minStockLevel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reorder Point</p>
                    <p>{product.reorderPoint}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`badge ${product.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {product.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Barcode</p>
                    <p className="font-mono text-sm">{scannedCode}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ScanBarcode size={20} />
              Riwayat Scan
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="table-header">Time</th>
                    <th className="table-header">Code</th>
                    <th className="table-header">Product</th>
                    <th className="table-header">SKU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {scanHistory.map((entry, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="table-cell text-sm">{entry.time}</td>
                      <td className="table-cell font-mono text-sm">{entry.code}</td>
                      <td className="table-cell">{entry.product.name}</td>
                      <td className="table-cell font-mono">{entry.product.sku}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!scanning && !product && !error && (
          <div className="card text-center py-12">
            <ScanBarcode size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">Barcode Scanner</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Gunakan kamera HP untuk memindai barcode produk, atau masukkan SKU secara manual.
              Mendukung format EAN-13, EAN-8, Code 128, Code 39, QR Code.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              PWA: Fitur ini berfungsi offline — data produk tersimpan di IndexedDB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

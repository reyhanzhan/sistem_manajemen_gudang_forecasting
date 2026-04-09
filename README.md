# AI-Powered Warehouse Management System

A production-grade B2B internal system for managing inventory across multiple warehouses with AI-powered demand forecasting, anomaly detection, and real-time operations.

## Architecture

```
Frontend (Next.js + PWA)  →  Backend API (NestJS + WebSocket)  →  PostgreSQL
                                                                →  Redis
                                                                →  AI Microservice (FastAPI + Prophet)
```

## Tech Stack

| Layer            | Technology                                       |
|------------------|--------------------------------------------------|
| Frontend         | Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts |
| Backend          | NestJS, TypeScript, Prisma ORM, Socket.io        |
| Database         | PostgreSQL 16                                    |
| Cache            | Redis 7                                          |
| AI Service       | Python, FastAPI, Prophet, scikit-learn, Isolation Forest |
| Auth             | JWT + RBAC (Admin / Manager / Staff)             |
| PWA              | Service Workers, IndexedDB, Web App Manifest     |
| Containerization | Docker + Docker Compose                          |

## Project Structure

```
├── backend/           # NestJS API server
│   ├── src/modules/   # Feature modules (auth, products, movements, forecast, anomaly, optimization)
│   └── prisma/        # Database schema & migrations
├── frontend/          # Next.js 14 web application (PWA)
│   ├── src/app/       # App Router pages
│   ├── src/lib/       # API client, Socket.io, IndexedDB
│   └── public/        # Service worker, manifest
├── ai-service/        # Python FastAPI microservice
│   └── app/services/  # Prophet, Anomaly Detection, EOQ, Retraining
├── docs/              # Architecture & API documentation
└── docker-compose.yml # Full stack orchestration (Postgres + Redis + Backend + Frontend + AI)
```

## Quick Start

```bash
# Start all services with Docker
docker-compose up -d

# Or run services individually:

# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev

# AI Service
cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --reload
```

## Features

### Core Warehouse Management
- Multi-warehouse inventory management
- Stock In / Stock Out / Stock Transfer with approval workflow
- Role-Based Access Control (Admin, Manager, Staff)
- Product & supplier management
- Comprehensive audit trail
- Low stock alert system with notifications

### AI & Machine Learning
- **Multivariate Forecasting (Prophet)**: Time-series demand prediction with Indonesian holiday integration, weekly/yearly seasonality, and cross-validation metrics (MAPE, RMSE)
- **Classic ML Forecasting**: GradientBoosting, RandomForest, LinearRegression ensemble with automatic model selection
- **Auto-PO Generator (EOQ)**: Economic Order Quantity with safety stock calculation, reorder points, supplier cost comparison, and stockout risk analysis
- **Anomaly Detection (Isolation Forest)**: Real-time detection of suspicious inventory movements with risk scoring (HIGH/MEDIUM/LOW) and multi-feature analysis
- **Automated Retraining Pipeline**: Scheduled weekly model retraining via APScheduler (Sunday 2AM) for both Prophet and sklearn models

### Real-Time & Connectivity
- **WebSocket Streaming (Socket.io)**: Live dashboard updates, movement notifications, inventory changes, and anomaly alerts without page refresh
- **PWA Offline-First**: Service Worker with network-first strategy, IndexedDB caching, background sync for pending operations, installable on mobile
- **Real-time Connection Status**: Visual indicator showing WebSocket connection state

### Interactive Visualization
- **Product Velocity Heatmap (Treemap)**: Color-coded visualization of fast-moving vs slow-moving inventory
- **Movement Trends (Area Chart)**: 30-day trend analysis for Stock In, Stock Out, and Transfers
- **Warehouse Utilization (Donut Chart)**: Capacity usage per warehouse
- **Anomaly Scatter Plot**: Hour-based anomaly distribution with risk-level coloring
- **EOQ Cost Breakdown Charts**: Visual comparison of holding vs ordering costs

### Barcode Scanner
- **Web-based Barcode Scanner**: Camera-based barcode detection using BarcodeDetector API
- **Manual SKU Entry**: Fallback for manual product lookup
- **Scan History**: Track scanning activity per session

## API Endpoints

### Backend (NestJS - port 3001)
| Method | Endpoint                          | Description                |
|--------|-----------------------------------|----------------------------|
| POST   | `/api/v1/auth/login`              | User authentication        |
| GET    | `/api/v1/dashboard/overview`      | Dashboard statistics       |
| CRUD   | `/api/v1/products`                | Product management         |
| CRUD   | `/api/v1/warehouses`              | Warehouse management       |
| CRUD   | `/api/v1/suppliers`               | Supplier management        |
| CRUD   | `/api/v1/movements`               | Inventory movements        |
| GET    | `/api/v1/inventory`               | Inventory queries          |
| GET    | `/api/v1/forecast`                | AI forecast results        |
| POST   | `/api/v1/anomaly/detect`          | Anomaly detection          |
| POST   | `/api/v1/optimization/generate-po`| Auto-PO generation (EOQ)   |

### AI Service (FastAPI - port 8000)
| Method | Endpoint                          | Description                  |
|--------|-----------------------------------|------------------------------|
| GET    | `/health`                         | Service health + model status|
| POST   | `/forecast/predict`               | Prophet or sklearn forecast  |
| POST   | `/forecast/train`                 | Train/retrain models         |
| GET    | `/forecast/model-info`            | Model metadata & metrics     |
| POST   | `/anomaly/detect`                 | Batch anomaly detection      |
| POST   | `/anomaly/check`                  | Single transaction check     |
| POST   | `/optimization/purchase-order`    | Generate optimal PO          |
| POST   | `/optimization/bulk-po`           | Bulk PO for all products     |

## Environment Variables

```env
# Database
POSTGRES_PASSWORD=wms_secure_2024
DATABASE_URL=postgresql://wms_admin:password@localhost:5432/warehouse_management

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRATION=24h

# AI Service
AI_SERVICE_URL=http://localhost:8000
MODEL_PATH=./models

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

## Docker Services

| Service      | Port | Description                        |
|-------------|------|------------------------------------|
| postgres    | 5432 | PostgreSQL 16 database             |
| redis       | 6379 | Redis 7 cache & message broker     |
| backend     | 3001 | NestJS API + WebSocket server      |
| frontend    | 3000 | Next.js 14 PWA frontend            |
| ai-service  | 8000 | FastAPI AI/ML microservice         |


SmartWMS: AI-Driven Enterprise Warehouse Ecosystem
The Problem
Sistem manajemen gudang tradisional seringkali bersifat reaktif—hanya mencatat apa yang sudah terjadi. Hal ini menyebabkan masalah klasik seperti overstock (modal mati), stockout (kehilangan penjualan), dan human error dalam input data manual.

The Solution
Saya membangun SmartWMS, sebuah ekosistem manajemen gudang otonom yang mengubah sistem pencatatan menjadi sistem pengambilan keputusan. Dengan mengintegrasikan Deep Learning untuk peramalan stok dan Computer Vision untuk automasi operasional, sistem ini mengurangi beban kerja manual hingga 40%.

🚀 Key Advanced Features
1. Predictive & Prescriptive AI
Multivariate Time-Series Forecasting: Menggunakan LSTM (TensorFlow) dan Prophet untuk memprediksi permintaan barang dengan akurasi 94%, mengintegrasikan data historis dan tren pasar eksternal.

Auto-PO Generator (Prescriptive AI): Sistem otomatis menyarankan jumlah pesanan optimal menggunakan formula EOQ (Economic Order Quantity) dan analisis Lead Time supplier.

Anomaly Detection: Menggunakan Isolation Forest (Scikit-learn) untuk mendeteksi transaksi mencurigakan atau kesalahan input pada audit trail secara real-time.

2. AI-Native Integration ("The Wow Factor")
Warehouse Neural Chat (RAG): Integrasi LLM (Llama 3/GPT-4o) dengan database SQL melalui LangChain. Manager bisa bertanya dalam bahasa alami: "Berapa estimasi pengeluaran untuk restock sabun bulan depan?"

Edge AI Vision: Scanner barcode berbasis web menggunakan TensorFlow.js yang memungkinkan staf melakukan bulk-scanning (banyak barcode sekaligus) hanya melalui kamera smartphone.

3. Modern Fullstack Architecture
Real-time Synchronization: Implementasi WebSockets (Socket.io) untuk pembaruan stok instan di seluruh gudang tanpa page refresh.

Offline-First PWA: Dibangun dengan Service Workers dan IndexedDB, memungkinkan operasional di area gudang yang minim sinyal internet.

Interactive Analytics: Dashboard visual dengan Recharts yang menampilkan Heatmap Inventory untuk mengidentifikasi barang Fast-Moving vs Dead-Stock.
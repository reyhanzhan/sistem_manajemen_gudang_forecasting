# 📦 AI-Powered Warehouse Management System

## Arsitektur Sistem & Dokumentasi Lengkap

> Proyek portfolio Full Stack + AI — Sistem Manajemen Gudang Modern dengan Demand Forecasting menggunakan Machine Learning.

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DOCKER COMPOSE NETWORK                        │
│                                                                      │
│  ┌──────────────┐    ┌───────────────┐    ┌────────────────────┐    │
│  │   Frontend    │    │    Backend     │    │    AI Service       │    │
│  │  Next.js 14   │◄──►│   NestJS 10   │◄──►│  FastAPI + sklearn  │    │
│  │  React 18     │    │  TypeScript    │    │  Python 3.11        │    │
│  │  Tailwind CSS │    │  Prisma ORM    │    │  Pandas / NumPy     │    │
│  │  Zustand      │    │  JWT + RBAC    │    │  joblib (model)     │    │
│  │  Recharts     │    │  Swagger docs  │    │                     │    │
│  │  :3000        │    │  :3001         │    │  :8000              │    │
│  └──────────────┘    └───────┬───────┘    └────────────────────┘    │
│                              │                                       │
│                     ┌────────▼────────┐                             │
│                     │   PostgreSQL 16  │                             │
│                     │    :5432         │                             │
│                     └─────────────────┘                             │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User → Frontend (Next.js) → REST API (NestJS) → PostgreSQL
                                    │
                                    ├── CRON Jobs (scheduled tasks)
                                    │    ├── Bulk Forecast (daily @2AM)
                                    │    └── Low Stock Check (hourly)
                                    │
                                    └── AI Microservice (FastAPI)
                                         ├── /forecast/predict
                                         ├── /forecast/train
                                         └── /forecast/model-info
```

---

## 📁 Folder Structure (Production-Level)

```
sistem_manajemen_gudang_forecasting/
├── docker-compose.yml            # Orchestrasi semua service
├── .env.example                  # Template environment variables
├── .gitignore
├── README.md
│
├── backend/                      # NestJS API Server
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema (15 model)
│   │   └── seed.ts               # Data seeder
│   └── src/
│       ├── main.ts               # Bootstrap + Swagger + CORS
│       ├── app.module.ts         # Root module
│       ├── common/
│       │   ├── prisma/           # PrismaService (global)
│       │   ├── decorators/       # @Roles, @CurrentUser
│       │   ├── guards/           # RolesGuard (RBAC)
│       │   └── strategies/       # JwtStrategy (Passport)
│       └── modules/
│           ├── auth/             # Login, Register, JWT
│           ├── users/            # User CRUD + warehouse assignment
│           ├── warehouses/       # Warehouse CRUD + summary
│           ├── products/         # Product catalog + cross-warehouse stock
│           ├── suppliers/        # Supplier management
│           ├── inventory/        # Stock levels, adjustments, low stock
│           ├── movements/        # Stock In/Out/Transfer + approval flow
│           ├── forecast/         # AI proxy + CRON bulk forecast
│           ├── notifications/    # Alerts + CRON low stock check
│           └── dashboard/        # Aggregated stats & trends
│
├── frontend/                     # Next.js Frontend
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── app/
│       │   ├── layout.tsx        # Root layout
│       │   ├── page.tsx          # Redirect → login/dashboard
│       │   ├── globals.css       # Tailwind + custom classes
│       │   ├── login/
│       │   │   └── page.tsx      # Login page
│       │   └── dashboard/
│       │       ├── layout.tsx    # Sidebar + auth guard
│       │       ├── page.tsx      # Dashboard overview + charts
│       │       ├── inventory/    # Stock management
│       │       ├── products/     # Product catalog CRUD
│       │       ├── warehouses/   # Warehouse management
│       │       ├── movements/    # Stock movement tracking
│       │       ├── suppliers/    # Supplier management
│       │       ├── forecast/     # AI forecasting dashboard
│       │       ├── notifications/# Alert center
│       │       └── users/        # User management (Admin)
│       ├── lib/
│       │   └── api.ts            # Axios client + all API functions
│       ├── store/
│       │   └── auth.store.ts     # Zustand auth state
│       └── components/
│           ├── layout/
│           │   ├── Sidebar.tsx   # Navigation sidebar
│           │   └── Header.tsx    # Page header
│           └── ui/
│               ├── StatCard.tsx  # Dashboard stat cards
│               └── DataTable.tsx # Generic data table
│
├── ai-service/                   # Python AI Microservice
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py               # FastAPI bootstrap
│       ├── config.py             # Configuration
│       ├── database.py           # SQLAlchemy connection
│       ├── api/
│       │   └── routes.py         # API endpoints
│       └── services/
│           ├── data_repository.py # SQL queries for historical data
│           └── forecasting.py    # ML pipeline (training + prediction)
│
└── docs/
    └── ARCHITECTURE.md           # Dokumen ini
```

---

## 🔑 Tech Stack Detail

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React 18, TypeScript | UI Framework (App Router) |
| Styling | Tailwind CSS 3.4, Lucide Icons | Design system |
| State | Zustand | Client state management |
| Charts | Recharts | Data visualization |
| Backend | NestJS 10, TypeScript | REST API framework |
| ORM | Prisma 5.8 | Type-safe database access |
| Auth | Passport JWT, bcrypt | Authentication & hashing |
| Validation | class-validator, class-transformer | DTO validation |
| Docs | @nestjs/swagger | OpenAPI documentation |
| Database | PostgreSQL 16 | Relational data store |
| AI/ML | FastAPI, scikit-learn 1.4 | ML microservice |
| Data | pandas, numpy, SQLAlchemy | Data processing |
| Container | Docker, Docker Compose | Deployment orchestration |

---

## 🔐 Authentication & Authorization

### JWT Flow
1. User login → Backend validates credentials (bcrypt)
2. Backend returns JWT access token + user data
3. Frontend stores token in localStorage + Zustand
4. Every API request includes `Authorization: Bearer <token>`
5. Backend validates JWT on every protected route

### RBAC (Role-Based Access Control)
| Role | Permissions |
|------|------------|
| ADMIN | Full access — user management, all CRUD, settings |
| MANAGER | Approve movements, manage inventory, view forecast |
| STAFF | Create movements, view products/inventory |

### Guard Implementation
```typescript
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
@Post('approve/:id')
approveMovement(@Param('id') id: string) { ... }
```

---

## 📊 Database Schema Overview

### Core Models (15 tables)
- **User** — System users with role and warehouse assignments
- **Warehouse** — Physical warehouse locations
- **StockLocation** — Zones within warehouses (rack/zone/bin)
- **Category** — Product categorization
- **Product** — Product catalog with SKU, pricing, min stock
- **Supplier** — Supplier registry
- **ProductSupplier** — Many-to-many product-supplier link
- **Inventory** — Current stock per product per warehouse (compound unique)
- **InventoryMovement** — Stock movement header (STOCK_IN/OUT/TRANSFER)
- **MovementLine** — Individual items in each movement
- **Notification** — System alerts per user
- **ForecastResult** — Historical forecast results
- **AuditLog** — Change tracking
- **UserWarehouse** — User-warehouse assignment

### Key Design Decisions
- **Compound unique** on Inventory (`productId + warehouseId + locationId`) — ensures single stock record per location
- **Transaction safety** — All inventory updates use Prisma `$transaction` to prevent partial writes
- **Soft references** — Movement tracks both source and destination warehouse
- **Audit trail** — AuditLog records entity changes with before/after JSON

---

## 🤖 AI Forecasting Service (Detail)

### ML Pipeline Architecture

```
Data Collection → Feature Engineering → Model Training → Prediction
     │                  │                    │              │
     ▼                  ▼                    ▼              ▼
PostgreSQL       28+ Features         3 Algorithms    Daily Forecast
(STOCK_OUT)    (lag, rolling,       (LinearReg,      + Confidence
  history      calendar, EWM)      RF, GBR + CV)      Intervals
```

### Feature Engineering (28+ features)

| Category | Features |
|----------|---------|
| Lag Features | demand_lag_1, lag_3, lag_7, lag_14, lag_21, lag_28 |
| Rolling Statistics | rolling_mean/std/max/min for 7, 14, 30-day windows |
| Calendar | day_of_week, month, quarter, year, is_weekend, is_month_start/end, day_of_year, week_of_year |
| Trend | trend (linear), diff_1, diff_7, ewm_7, ewm_14 |

### Model Selection

```python
models = {
    'linear_regression': LinearRegression(),
    'random_forest': RandomForestRegressor(n_estimators=100, random_state=42),
    'gradient_boosting': GradientBoostingRegressor(n_estimators=100, random_state=42),
}
# TimeSeriesSplit CV (3 splits) → Select by lowest MAE
```

### Prediction Output
```json
{
  "product_id": "abc-123",
  "predicted_demand": 145.5,
  "daily_average": 4.85,
  "daily_predictions": [5.2, 4.8, 5.1, ...],
  "confidence_lower": 120.3,
  "confidence_upper": 170.7,
  "current_stock": 80,
  "suggested_reorder": 91,
  "model_metrics": {
    "best_model": "gradient_boosting",
    "mae": 1.234,
    "rmse": 1.567,
    "r2_score": 0.856
  }
}
```

---

## 🏆 Mengapa Proyek Ini Kuat untuk Portfolio?

### 1. **Enterprise-Grade Architecture**
Bukan CRUD biasa — ini menunjukkan kemampuan mendesain sistem yang kompleks dengan:
- Microservices architecture (3 independent services)
- Docker container orchestration
- RBAC security model
- Approval workflow (business logic)

### 2. **Full Stack Mastery**
Menguasai SELURUH stack teknologi modern:
- TypeScript di frontend DAN backend
- React state management (Zustand)
- Server-side rendering capability (Next.js)
- Type-safe ORM (Prisma)

### 3. **Real AI/ML Integration**
Bukan sekadar memanggil API — ini ML pipeline lengkap:
- Custom feature engineering (28+ fitur)
- Multi-model comparison + cross-validation
- Iterative forecasting with confidence intervals
- Model persistence + retraining capability

### 4. **Production Patterns**
Teknik-teknik yang dipakai di perusahaan besar:
- Transaction safety (Prisma $transaction)
- CRON scheduling (automated tasks)
- Error handling & validation
- API documentation (Swagger/OpenAPI)
- Database seeding for development

### 5. **Domain Expertise (B2B/Enterprise)**
Menunjukkan pemahaman domain bisnis supply chain:
- Multi-warehouse inventory tracking
- Stock movement workflow (IN/OUT/Transfer)
- Reorder point calculation
- Low stock alert system

---

## 🚀 Quick Start

```bash
# 1. Clone & setup
cp .env.example .env

# 2. Start all services
docker-compose up -d

# 3. Run migrations & seed
cd backend
npx prisma migrate dev
npx prisma db seed

# 4. Access
# Frontend:  http://localhost:3000
# Backend:   http://localhost:3001/api/docs (Swagger)
# AI Service: http://localhost:8000/docs
```

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@wms.com | password123 |
| Manager | manager@wms.com | password123 |
| Staff | staff@wms.com | password123 |

---

## 📄 API Endpoints Summary

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/login | JWT login |
| POST | /api/v1/auth/register | Create account |
| GET | /api/v1/auth/profile | Current user |

### Products, Warehouses, Suppliers, Inventory
Standard CRUD + search, pagination, filtering

### Movements
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/movements | Create movement |
| PATCH | /api/v1/movements/:id/approve | Approve (Manager+) |
| PATCH | /api/v1/movements/:id/reject | Reject (Manager+) |

### Forecast
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/forecast/predict | Run AI prediction |
| POST | /api/v1/forecast/train | Retrain model |
| GET | /api/v1/forecast/health | AI service health |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/dashboard/overview | Stats overview |
| GET | /api/v1/dashboard/trends | Movement trends |
| GET | /api/v1/dashboard/warehouse-utilization | Capacity % |


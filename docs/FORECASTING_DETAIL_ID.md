# 🤖 Penjelasan Detail Alur Forecasting (Bahasa Indonesia)

## Bagaimana Sistem AI Demand Forecasting Bekerja

### Gambaran Umum

Sistem forecasting ini menggunakan **Machine Learning** untuk memprediksi berapa banyak unit produk yang akan dibutuhkan (demand) dalam periode waktu tertentu (misalnya 30 hari ke depan). Tujuannya? **Supaya gudang tidak kehabisan stok dan tidak kelebihan stok.**

---

## 📋 Alur Lengkap Step-by-Step

### STEP 1: Pengumpulan Data (Data Collection)

```
PostgreSQL Database
     │
     ▼
[inventory_movements] + [movement_lines]
     │
     ▼
Filter: type = STOCK_OUT dan TRANSFER (yang keluar dari gudang)
     │  
     ▼
Agregasi: GROUP BY tanggal → jumlah total unit yang keluar per hari
     │
     ▼
Fill Missing Dates: Tanggal yang tidak ada transaksi → isi dengan 0
```

**Kenapa hanya STOCK_OUT dan TRANSFER?**
Karena yang kita prediksi adalah DEMAND (permintaan/kebutuhan). Barang yang KELUAR dari gudang = barang yang diminta oleh pelanggan atau cabang lain. STOCK_IN bukan demand, itu supply.

**Query SQL:**
```sql
SELECT DATE(im.created_at) as date, SUM(ml.quantity) as total_demand
FROM inventory_movements im
JOIN movement_lines ml ON im.id = ml.movement_id
WHERE im.status = 'COMPLETED'
  AND im.type IN ('STOCK_OUT', 'TRANSFER')
  AND im.source_warehouse_id = ?    -- dari gudang tertentu
  AND ml.product_id = ?             -- untuk produk tertentu
GROUP BY DATE(im.created_at)
ORDER BY date
```

**Handling Data Kosong:**
Kalau data historis kurang dari 30 hari, sistem akan generate **synthetic data** (data buatan) dengan pola:
- Base demand (random 5-20 unit/hari)
- Seasonality mingguan (hari kerja demand lebih tinggi)
- Seasonality bulanan
- Random noise

Ini agar model tetap bisa dilatih meskipun sistem baru di-deploy.

---

### STEP 2: Feature Engineering (Rekayasa Fitur)

Ini adalah **langkah paling kritis** dalam ML. Data mentah (tanggal + jumlah) TIDAK CUKUP untuk membuat prediksi akurat. Kita perlu mengekstrak "pola tersembunyi" dari data.

**28+ fitur yang dibuat:**

#### a) Lag Features (Fitur Historis)
```python
demand_lag_1   # demand 1 hari lalu
demand_lag_3   # demand 3 hari lalu
demand_lag_7   # demand 1 minggu lalu
demand_lag_14  # demand 2 minggu lalu
demand_lag_21  # demand 3 minggu lalu
demand_lag_28  # demand 4 minggu lalu (1 bulan)
```
**Tujuan:** Memberi model "ingatan" tentang demand di masa lalu. Kalau demand minggu lalu tinggi, kemungkinan minggu ini juga tinggi.

#### b) Rolling Statistics (Statistik Jendela Bergerak)
```python
# Window 7 hari
rolling_mean_7   # rata-rata 7 hari terakhir
rolling_std_7    # standar deviasi 7 hari terakhir
rolling_max_7    # demand tertinggi 7 hari terakhir
rolling_min_7    # demand terendah 7 hari terakhir

# Window 14 hari dan 30 hari → sama
rolling_mean_14, rolling_std_14, rolling_max_14, rolling_min_14
rolling_mean_30, rolling_std_30, rolling_max_30, rolling_min_30
```
**Tujuan:** Menangkap **trend** (naik/turun) dan **volatility** (stabil/fluktuatif) dari demand.

#### c) Calendar Features (Fitur Kalender)
```python
day_of_week    # 0=Senin, 6=Minggu
month          # 1-12
quarter        # 1-4
year           # tahun
is_weekend     # 1 jika Sabtu/Minggu
is_month_start # 1 jika tanggal 1
is_month_end   # 1 jika tanggal terakhir bulan
day_of_year    # 1-365/366
week_of_year   # 1-52
```
**Tujuan:** Menangkap pola musiman. Contoh:
- Demand lebih rendah di weekend
- Demand tinggi di awal bulan (gajian)
- Demand tinggi di Q4 (akhir tahun / holiday season)

#### d) Trend & Momentum Features
```python
trend      # index baris (0, 1, 2, ...) — linear trend
diff_1     # selisih demand hari ini vs kemarin
diff_7     # selisih demand hari ini vs 1 minggu lalu
ewm_7      # exponential weighted mean 7 hari
ewm_14     # exponential weighted mean 14 hari
```
**Tujuan:** 
- `trend` → menangkap apakah demand secara umum naik atau turun
- `diff` → menangkap perubahan mendadak (spike/drop)
- `ewm` → memberikan bobot lebih besar ke data terbaru (lebih relevan)

---

### STEP 3: Training Model (Pelatihan Model)

Setelah fitur siap, kita melatih **3 algoritma ML** dan pilih yang terbaik:

#### Model 1: Linear Regression
```
y = w₁x₁ + w₂x₂ + ... + wₙxₙ + b
```
- Paling sederhana, cepat
- Baik kalau hubungan fitur-demand relatif linear
- Baseline model

#### Model 2: Random Forest Regressor
```
Ensemble dari 100 Decision Trees
Setiap tree dilatih pada subset random dari data
Prediksi = rata-rata prediksi semua tree
```
- Menangkap hubungan non-linear
- Robust terhadap outlier
- Tidak mudah overfitting

#### Model 3: Gradient Boosting Regressor
```
Iterative: Setiap tree belajar dari ERROR tree sebelumnya
Tree 1 prediksi → hitung error → Tree 2 memperbaiki error → ...
```
- Biasanya paling akurat untuk tabular data
- Menangkap pola kompleks
- Tapi lebih lambat training

#### Cross-Validation: TimeSeriesSplit

```
Split 1: [Train: bulan 1-2] → [Test: bulan 3]
Split 2: [Train: bulan 1-3] → [Test: bulan 4]
Split 3: [Train: bulan 1-4] → [Test: bulan 5]
```

**PENTING:** Kita pakai `TimeSeriesSplit`, bukan random split biasa. Kenapa?
Karena data time series BERURUTAN. Kita tidak boleh melatih model dengan data MASA DEPAN lalu test dengan data MASA LALU. Itu namanya **data leakage**.

#### Selection: Pilih Model Terbaik
```python
# Hitung MAE (Mean Absolute Error) untuk setiap model
# MAE = rata-rata |actual - predicted|
# Model dengan MAE TERENDAH → dipilih sebagai model terbaik
best_model = min(models, key=lambda m: m.mae)
```

#### Metrik yang Dihitung:
| Metrik | Arti | Bagus jika |
|--------|------|-----------|
| MAE | Rata-rata error absolut | Semakin kecil |
| RMSE | Root mean squared error | Semakin kecil |
| R² Score | Seberapa baik model fit | Mendekati 1.0 |

#### Penyimpanan Model
```python
# Model disimpan dengan joblib → file binary
joblib.dump(model, 'models/forecasting_model.joblib')

# Bisa di-load lagi tanpa training ulang
model = joblib.load('models/forecasting_model.joblib')
```

---

### STEP 4: Prediksi (Prediction / Inference)

Setelah model terlatih, prosesnya:

```
Input: product_id + warehouse_id + period_days (misal 30)
                    │
                    ▼
1. Ambil data demand historis (90 hari terakhir)
                    │
                    ▼
2. Buat fitur untuk HARI PERTAMA di masa depan
   (lag dari data historis terakhir, rolling stats, kalender besok)
                    │
                    ▼
3. Model prediksi demand hari 1 → misalnya 5.2 unit
                    │
                    ▼
4. Tambahkan hasil prediksi ke data historis
   (sekarang kita punya "data" sampai besok)
                    │
                    ▼
5. Buat fitur untuk hari ke-2
   (lag sekarang termasuk prediksi hari 1)
                    │
                    ▼
6. Prediksi hari 2 → 4.8 unit
                    │
                    ▼
7. Ulangi sampai hari ke-30
                    │
                    ▼
Output: [5.2, 4.8, 5.1, 3.9, 6.2, ...] (30 nilai)
```

**Ini disebut ITERATIVE FORECASTING** — setiap prediksi menjadi input untuk prediksi berikutnya. Seperti berjalan di kegelapan sambil membuat pijakan satu per satu.

---

### STEP 5: Confidence Interval (Interval Kepercayaan)

```python
# Hitung residual (error) dari data training
residuals = actual_values - predicted_values
residual_std = std(residuals)  # standar deviasi error

# 95% confidence interval
z_score = 1.96  # untuk 95% CI

# Semakin jauh prediksi ke depan, semakin tidak yakin
confidence_upper = predicted_demand + z_score * residual_std * sqrt(period_days)
confidence_lower = max(0, predicted_demand - z_score * residual_std * sqrt(period_days))
```

**Artinya:** "Kami 95% yakin demand actual akan berada di antara `lower` dan `upper`."

Semakin panjang periode prediksi → interval semakin lebar (semakin tidak yakin).

---

### STEP 6: Reorder Suggestion (Saran Pemesanan Ulang)

```python
# Safety stock = buffer 20% dari predicted demand
safety_stock = predicted_demand * 0.2

# Ambil stok saat ini dari database
current_stock = query("SELECT SUM(quantity) FROM inventory WHERE product_id = ?")

# Hitung berapa yang perlu dipesan
reorder_qty = predicted_demand + safety_stock - current_stock
suggested_reorder = max(0, reorder_qty)  # tidak boleh negatif
```

**Contoh:**
- Prediksi demand 30 hari = 150 unit
- Safety stock (20%) = 30 unit
- Stok saat ini = 80 unit
- **Saran reorder = 150 + 30 - 80 = 100 unit**

Kalau stok 200 → saran reorder = max(0, 150+30-200) = 0 (stok cukup)

---

### STEP 7: Automated Scheduling (CRON Jobs)

Backend menjalankan task otomatis:

```typescript
// Setiap hari jam 2 pagi → forecast semua produk aktif
@Cron('0 2 * * *')
async handleBulkForecast() {
  // 1. Ambil semua product aktif
  // 2. Untuk setiap product → panggil AI service
  // 3. Simpan hasil ke tabel ForecastResult
}

// Setiap jam → cek stok rendah
@Cron('0 * * * *')
async handleLowStockCheck() {
  // 1. Ambil semua inventory dimana quantity < minimumStock
  // 2. Buat notification untuk ADMIN & MANAGER
}
```

---

## 🔄 Alur End-to-End (Contoh Kasus)

```
KASUS: Manager ingin tahu berapa banyak "Mie Instan" yang harus dipesan
untuk Gudang Jakarta dalam 30 hari ke depan.

1. Manager buka halaman Forecast di frontend
2. Pilih produk "Mie Instan" dan period 30 hari
3. Klik "Run Forecast"

4. Frontend → POST /api/v1/forecast/predict
   { productId: "xxx", warehouseId: "yyy", periodDays: 30 }

5. Backend → POST http://ai-service:8000/forecast/predict
   { product_id: "xxx", warehouse_id: "yyy", period_days: 30 }

6. AI Service:
   a. Query data demand historis dari PostgreSQL
   b. Buat 28+ fitur
   c. Load model (atau train jika belum ada)
   d. Prediksi iteratif 30 hari
   e. Hitung confidence interval
   f. Query stok saat ini
   g. Hitung reorder suggestion

7. AI Service → response JSON ke Backend

8. Backend → simpan ke ForecastResult + kirim ke Frontend

9. Frontend menampilkan:
   - Total predicted demand: 450 unit
   - Daily average: 15 unit/hari
   - Confidence range: 380 - 520 unit (95%)
   - Current stock: 200 unit
   - Suggested reorder: 310 unit
   - Grafik prediksi harian
   - Model performance (MAE, RMSE, R²)

10. Manager → buat Stock Movement (STOCK_IN) 310 unit dari supplier
```

---

## 🧮 Ringkasan Formula Utama

| Perhitungan | Formula |
|-------------|---------|
| MAE | $\frac{1}{n} \sum_{i=1}^{n} |y_i - \hat{y}_i|$ |
| RMSE | $\sqrt{\frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2}$ |
| R² Score | $1 - \frac{\sum(y_i - \hat{y}_i)^2}{\sum(y_i - \bar{y})^2}$ |
| Safety Stock | $predicted\_demand \times 0.2$ |
| Reorder Qty | $max(0, predicted + safety - current)$ |
| Confidence | $predicted \pm 1.96 \times \sigma_{residual} \times \sqrt{days}$ |

---

## 💡 Tips Pengembangan Lebih Lanjut

1. **Tambah model LSTM/Prophet** untuk time series yang lebih kompleks
2. **A/B testing** antara model untuk setiap produk
3. **Feature importance** visualization (SHAP values)
4. **External data** integration (cuaca, event, ekonomi)
5. **Real-time streaming** dengan WebSocket untuk update stok live
6. **Multi-tenant** architecture untuk SaaS
7. **Barcode/QR scanner** integration untuk mobile warehouse app

---

*Dokumentasi ini ditulis sebagai bagian dari portfolio proyek AI-Powered Warehouse Management System.*

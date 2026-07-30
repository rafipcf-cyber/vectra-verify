-- VECTRA — Product Authentication Schema
-- Compatible with SQLite (prototype) and PostgreSQL/MySQL (production)
-- lihat README.md bagian "Migrasi ke SQL Server Produksi" untuk versi Postgres

-- ============================================
-- TABEL 1: products
-- Satu baris = satu unit produk fisik + tag NFC-nya
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id            TEXT PRIMARY KEY,      -- ID unik di dalam NFC, contoh: 'ABC123XYZ'
  name          TEXT NOT NULL,         -- Nama produk, contoh: 'VECTRA Hoodie Onyx'
  sku           TEXT,                  -- Kode SKU internal
  batch         TEXT,                  -- Nomor batch produksi
  size          TEXT,                  -- Ukuran (S/M/L/XL, dst)
  status        TEXT NOT NULL DEFAULT 'active', -- active | revoked | recalled
  registered_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- TABEL 2: scans
-- Satu baris = satu kejadian scan NFC/QR
-- ============================================
CREATE TABLE IF NOT EXISTS scans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id    TEXT NOT NULL,
  scanned_at    TEXT NOT NULL DEFAULT (datetime('now')),
  lat           REAL,                  -- NULL jika user tidak izinkan lokasi
  lng           REAL,
  city          TEXT,                  -- Hasil reverse-geocoding (opsional)
  ip_address    TEXT,
  user_agent    TEXT,
  is_suspicious INTEGER NOT NULL DEFAULT 0,   -- 0/1 flag hasil deteksi anomali
  flag_reason   TEXT                   -- Alasan kalau suspicious, contoh: 'Jarak 850km dalam 12 menit'
  -- Catatan: sengaja TIDAK diberi FOREIGN KEY ke products(id).
  -- Kita justru ingin mencatat percobaan scan ID PALSU/tidak terdaftar juga,
  -- jadi product_id di tabel ini boleh saja tidak ada di tabel products.
);

CREATE INDEX IF NOT EXISTS idx_scans_product_id ON scans(product_id);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at);

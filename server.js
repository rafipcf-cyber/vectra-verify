// VECTRA — Product Verification Server
// Level 2: NFC/QR hanya bawa ID -> server yang menentukan asli/tidak,
// mencatat histori scan, dan mendeteksi anomali lokasi.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 3000;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const DB_DIR = path.join(__dirname, "db");
const DB_FILE = process.env.DATABASE_PATH || path.join(DB_DIR, "vectra.json");

if (!ADMIN_API_KEY) {
  console.warn("WARNING: ADMIN_API_KEY tidak diset. Endpoint admin akan memblokir akses sampai Anda menambahkan kunci.");
}

const defaultProducts = [
  { id: "ABC123XYZ", name: "VECTRA Hoodie Onyx", sku: "VEC-HD-001", batch: "B2026-01", size: "L", status: "active", registered_at: new Date().toISOString() },
  { id: "VEC-0002-TEE", name: "VECTRA Tee Lime Edge", sku: "VEC-TE-002", batch: "B2026-01", size: "M", status: "active", registered_at: new Date().toISOString() },
  { id: "VEC-0003-JKT", name: "VECTRA Jacket Infinity", sku: "VEC-JK-003", batch: "B2026-02", size: "XL", status: "revoked", registered_at: new Date().toISOString() },
];

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let dbData = { products: [], scans: [] };
function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf8");
}

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      dbData = JSON.parse(raw);
      if (!Array.isArray(dbData.products) || !Array.isArray(dbData.scans)) {
        throw new Error("Invalid DB structure");
      }
    } catch (error) {
      console.warn("DB file rusak, membuat ulang database prototype:", error.message);
      dbData = { products: [], scans: [] };
      saveDb();
    }
  }

  if (dbData.products.length === 0) {
    dbData.products = defaultProducts;
    dbData.scans = [];
    saveDb();
    console.log(`Database prototype dibuat di ${DB_FILE} dengan ${defaultProducts.length} produk contoh.`);
  }
}

loadDb();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_PLAUSIBLE_SPEED_KMH = 120;

function getProduct(id) {
  return dbData.products.find((product) => product.id === id);
}

function getLastScan(id) {
  const scans = dbData.scans.filter((scan) => scan.product_id === id);
  return scans.sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at))[0] || null;
}

function addScan(scan) {
  dbData.scans.push(scan);
  saveDb();
}

function getScanCount(id) {
  return dbData.scans.filter((scan) => scan.product_id === id).length;
}

function getScansByProduct(id) {
  return dbData.scans
    .filter((scan) => scan.product_id === id)
    .sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at));
}

// URL yang ditulis di dalam NFC/QR: https://domainmu.com/verify?id=ABC123XYZ
app.get("/verify", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/verify", (req, res) => {
  const { id, lat, lng } = req.query;

  if (!id) {
    return res.status(400).json({ ok: false, error: "ID produk tidak ada." });
  }

  const product = getProduct(id);
  const lastScan = getLastScan(id);

  let isSuspicious = 0;
  let flagReason = null;

  const hasLoc = lat !== undefined && lng !== undefined && lat !== "" && lng !== "";
  const latNum = hasLoc ? parseFloat(lat) : null;
  const lngNum = hasLoc ? parseFloat(lng) : null;

  if (product && lastScan && hasLoc && lastScan.lat !== null && lastScan.lng !== null) {
    const distanceKm = haversineKm(lastScan.lat, lastScan.lng, latNum, lngNum);
    const minutesElapsed = (Date.now() - new Date(lastScan.scanned_at).getTime()) / 60000;
    const hoursElapsed = Math.max(minutesElapsed / 60, 1 / 60);
    const impliedSpeed = distanceKm / hoursElapsed;

    if (distanceKm > 30 && impliedSpeed > MAX_PLAUSIBLE_SPEED_KMH) {
      isSuspicious = 1;
      flagReason = `Jarak ${distanceKm.toFixed(0)} km dari scan sebelumnya, hanya berselang ${minutesElapsed.toFixed(0)} menit (mustahil ditempuh manusia).`;
    }
  }

  const scan = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    product_id: id,
    scanned_at: new Date().toISOString(),
    lat: latNum,
    lng: lngNum,
    city: null,
    ip_address: req.ip,
    user_agent: req.get("user-agent") || null,
    is_suspicious: isSuspicious,
    flag_reason: flagReason,
  };

  addScan(scan);

  const scanCount = getScanCount(id);

  if (!product) {
    return res.json({ ok: true, authentic: false, reason: "not_registered", scanCount });
  }

  if (product.status !== "active") {
    return res.json({
      ok: true,
      authentic: false,
      reason: product.status,
      product: { name: product.name, sku: product.sku },
      scanCount,
    });
  }

  return res.json({
    ok: true,
    authentic: true,
    product: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      batch: product.batch,
      size: product.size,
      registeredAt: product.registered_at,
    },
    scanCount,
    suspicious: !!isSuspicious,
    flagReason,
  });
});

app.get("/api/products/:id/scans", (req, res) => {
  if (!ADMIN_API_KEY || req.get("x-admin-key") !== ADMIN_API_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized access. Set X-Admin-Key header." });
  }

  const rows = getScansByProduct(req.params.id);
  res.json({ ok: true, scans: rows });
});

app.listen(PORT, () => {
  console.log(`VECTRA verify server jalan di http://localhost:${PORT}`);
});

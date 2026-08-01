// Isi database prototype dengan beberapa produk contoh untuk testing.
// Jalankan: npm run seed

const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "vectra.json");
const products = [
  {
    id: "VEC-0001-BDG",
    name: "VECTRA Kaos Biru",
    sku: "VEC-HD-001",
    batch: "B2026-01",
    size: "S",
    status: "active",
    registered_at: new Date().toISOString(),
  },
  {
    id: "VEC-0002-TEE",
    name: "VECTRA Kaos Putih",
    sku: "VEC-TE-002",
    batch: "B2026-01",
    size: "XL",
    status: "active",
    registered_at: new Date().toISOString(),
  },
  {
    id: "VEC-0003-JKT",
    name: "VECTRA Jacket Infinity",
    sku: "VEC-JK-003",
    batch: "B2026-02",
    size: "XL",
    status: "revoked",
    registered_at: new Date().toISOString(),
  },
  {
    id: "VEC-0004-SNK",
    name: "VECTRA Sneakers Neon",
    sku: "VEC-SN-004",
    batch: "B2026-03",
    size: "42",
    status: "active",
    registered_at: new Date().toISOString(),
  },
  {
    id: "VEC-0005-BAG",
    name: "VECTRA Sling Bag Photon",
    sku: "VEC-BG-005",
    batch: "B2026-03",
    size: "One Size",
    status: "recalled",
    registered_at: new Date().toISOString(),
  },
  {
    id: "VEC-0006-HAT",
    name: "VECTRA Cap Eclipse",
    sku: "VEC-HT-006",
    batch: "B2026-04",
    size: "Adjustable",
    status: "active",
    registered_at: new Date().toISOString(),
  },
];

const dbData = { products, scans: [] };
fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), "utf8");

console.log(`Seed selesai. ${products.length} produk ditambahkan ke ${DB_FILE}`);
products.forEach((p) => console.log(`  - ${p.id} (${p.name}) [${p.status}]`));
console.log("\nCoba buka: http://localhost:3000/verify?id=ABC123XYZ");

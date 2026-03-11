# 🍕 Just Eat Me — Italian Restaurant Website

Website restoran Italia lengkap dengan sistem pemesanan & admin panel.
**Stack: Node.js + Express + SQLite (better-sqlite3)**

---

## 📁 Struktur File

```
just-eat-me/
├── server.js              ← Express server + API
├── package.json           ← Dependencies
├── README.md
│
├── database/
│   └── justeatme.db       ← SQLite (auto-dibuat, jangan dihapus)
│
├── views/
│   ├── index.html         ← Landing page
│   └── admin.html         ← Admin panel
│
└── public/
    ├── css/
    │   ├── style.css      ← CSS landing page
    │   └── admin.css      ← CSS admin panel
    └── js/
        ├── main.js        ← JS cart & ordering
        ├── admin.js       ← JS admin dashboard
        └── menu-data.json ← Data menu (JSON)
```

---

## 🚀 Cara Menjalankan di VSCode

### 1. Install dependencies (SEKALI SAJA)
Buka terminal di VSCode (`Ctrl+`` `), lalu:
```bash
npm install
```

### 2. Jalankan server
```bash
npm start
```

### 3. Buka di browser
| URL | Keterangan |
|-----|-----------|
| http://localhost:3000 | 🍕 Landing page |
| http://localhost:3000/admin | ⚙️ Admin panel |

> **Tips VSCode:** Install ekstensi **"Thunder Client"** untuk test API langsung di VSCode.

---

## 🔌 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/orders` | Semua pesanan + items |
| POST | `/api/orders` | Buat pesanan baru |
| GET | `/api/orders/:id` | Detail satu pesanan |
| PATCH | `/api/orders/:id/status` | Update status |
| DELETE | `/api/orders/:id` | Hapus satu pesanan |
| DELETE | `/api/orders` | Hapus semua pesanan |
| GET | `/api/stats` | Statistik dashboard |

### Contoh POST /api/orders
```json
{
  "cust_name": "Budi Santoso",
  "cust_phone": "08123456789",
  "order_type": "dine-in",
  "address": "",
  "note": "Extra keju",
  "items": [
    { "name": "Pizza Margherita", "price": 75000, "qty": 2 },
    { "name": "Cappuccino",       "price": 42000, "qty": 1 }
  ]
}
```

### Response sukses
```json
{
  "id": 1,
  "order_code": "JEM-123456",
  "message": "Pesanan berhasil dibuat"
}
```

---

## 🗄️ Database Schema (SQLite)

```sql
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code  TEXT    NOT NULL,
  cust_name   TEXT    NOT NULL,
  cust_phone  TEXT    NOT NULL,
  order_type  TEXT    NOT NULL,   -- 'dine-in' | 'takeaway' | 'delivery'
  address     TEXT    DEFAULT '',
  note        TEXT    DEFAULT '',
  total       INTEGER NOT NULL,
  status      TEXT    DEFAULT 'Baru',
  created_at  TEXT    DEFAULT (datetime('now','localtime'))
);

CREATE TABLE order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_name  TEXT    NOT NULL,
  item_price INTEGER NOT NULL,
  quantity   INTEGER NOT NULL
);
```

---

## ✨ Fitur

### 🌐 Landing Page (index.html)
- Hero + animasi chef mengambang
- 19 menu dengan foto asli (fallback gradient jika offline)
- Filter kategori: Pizza, Pasta, Kopi, Mocktail, Dessert, Snack
- Keranjang belanja sidebar
- Checkout: Dine In / Takeaway / Delivery
- Pesanan POST ke API → tersimpan di SQLite

### ⚙️ Admin Panel (admin.html)
- Dashboard statistik real-time
- Tabel pesanan dengan filter & search
- Detail pesanan + update status
- Klik status → siklus otomatis (Baru→Diproses→Siap→Selesai)
- Analitik: menu terlaris, tipe pesanan, breakdown status
- Auto-refresh setiap 12 detik

---

## 🛠 Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Server | Node.js v14+ + **Express 4** |
| Database | **SQLite** via **better-sqlite3** |
| Frontend | Vanilla HTML / CSS / JS |
| Fonts | Google Fonts |
| Images | Unsplash CDN + emoji fallback |

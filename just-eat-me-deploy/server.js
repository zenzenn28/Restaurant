const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Database ────────────────────────────────────────────────
const DB_DIR  = path.join(__dirname, 'database');
const DB_FILE = path.join(DB_DIR, 'justeatme.db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);

const db = new sqlite3.Database(DB_FILE, err => {
  if (err) { console.error('DB error:', err.message); process.exit(1); }
  console.log('✅ Database ready:', DB_FILE);
});

const run = (sql, p=[]) => new Promise((res,rej) => db.run(sql, p, function(e){ e?rej(e):res(this); }));
const all = (sql, p=[]) => new Promise((res,rej) => db.all(sql, p, (e,r)=>e?rej(e):res(r)));
const get = (sql, p=[]) => new Promise((res,rej) => db.get(sql, p, (e,r)=>e?rej(e):res(r)));

db.serialize(() => {
  db.run("PRAGMA journal_mode = WAL");
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_code TEXT NOT NULL,
    cust_name TEXT NOT NULL,
    cust_phone TEXT NOT NULL,
    order_type TEXT NOT NULL,
    address TEXT DEFAULT '',
    note TEXT DEFAULT '',
    total INTEGER NOT NULL,
    status TEXT DEFAULT 'Baru',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    item_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  )`);
});

// ─── Auto-status scheduler ───────────────────────────────────
// Baru → Diproses : 2 menit
// Diproses → Siap : 15 menit
// Siap → Selesai  : 30 menit
const AUTO_RULES = [
  { from: 'Baru',     to: 'Diproses', minutes: 2  },
  { from: 'Diproses', to: 'Siap',     minutes: 15 },
  { from: 'Siap',     to: 'Selesai',  minutes: 30 },
];

async function runAutoStatus() {
  try {
    for (const rule of AUTO_RULES) {
      const cutoff = new Date(Date.now() - rule.minutes * 60 * 1000);
      // Format waktu sesuai SQLite (YYYY-MM-DD HH:MM:SS)
      const cutoffStr = cutoff.toISOString().replace('T', ' ').slice(0, 19);
      await run(
        `UPDATE orders SET status = ?
         WHERE status = ?
           AND created_at <= ?`,
        [rule.to, rule.from, cutoffStr]
      );
    }
  } catch(e) { console.error('Auto-status error:', e.message); }
}

// Jalankan setiap 30 detik
setInterval(runAutoStatus, 30 * 1000);
// Jalankan sekali saat server start
setTimeout(runAutoStatus, 2000);
console.log('⏱️  Auto-status scheduler aktif');

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── HTML pages ──────────────────────────────────────────────
app.get('/',      (req,res) => res.sendFile(path.join(__dirname,'views','index.html')));
app.get('/admin', (req,res) => res.sendFile(path.join(__dirname,'views','admin.html')));

// ─── GET /api/orders ─────────────────────────────────────────
app.get('/api/orders', async (req,res) => {
  try {
    const orders = await all("SELECT * FROM orders ORDER BY id DESC");
    const items  = await all("SELECT * FROM order_items");
    res.json(orders.map(o => ({ ...o, items: items.filter(i => i.order_id === o.id) })));
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ─── GET /api/orders/:id ─────────────────────────────────────
app.get('/api/orders/:id', async (req,res) => {
  try {
    const order = await get("SELECT * FROM orders WHERE id=?", [req.params.id]);
    if (!order) return res.status(404).json({error:'Pesanan tidak ditemukan'});
    const items = await all("SELECT * FROM order_items WHERE order_id=?", [order.id]);
    res.json({...order, items});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ─── GET /api/track/:order_code — untuk pembeli cek status ───
app.get('/api/track/:order_code', async (req,res) => {
  try {
    const code  = req.params.order_code.toUpperCase();
    const order = await get("SELECT * FROM orders WHERE UPPER(order_code)=?", [code]);
    if (!order) return res.status(404).json({error:'Order ID tidak ditemukan. Periksa kembali kode pesanan kamu.'});
    const items = await all("SELECT * FROM order_items WHERE order_id=?", [order.id]);
    res.json({...order, items});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ─── POST /api/orders ────────────────────────────────────────
app.post('/api/orders', async (req,res) => {
  const {cust_name,cust_phone,order_type,address,note,items} = req.body;
  if (!cust_name||!cust_phone||!order_type||!items?.length)
    return res.status(400).json({error:'Data tidak lengkap'});

  const total      = items.reduce((s,i)=>s+i.price*i.qty, 0);
  const order_code = 'JEM-'+Date.now().toString().slice(-6);
  try {
    const r = await run(
      "INSERT INTO orders (order_code,cust_name,cust_phone,order_type,address,note,total) VALUES (?,?,?,?,?,?,?)",
      [order_code,cust_name,cust_phone,order_type,address||'',note||'',total]
    );
    for (const item of items)
      await run("INSERT INTO order_items (order_id,item_name,item_price,quantity) VALUES (?,?,?,?)",
        [r.lastID, item.name, item.price, item.qty]);
    res.status(201).json({id:r.lastID, order_code, message:'Pesanan berhasil dibuat'});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ─── PATCH /api/orders/:id/status ────────────────────────────
app.patch('/api/orders/:id/status', async (req,res) => {
  const {status} = req.body;
  if (!['Baru','Diproses','Siap','Selesai','Batal'].includes(status))
    return res.status(400).json({error:'Status tidak valid'});
  try {
    await run("UPDATE orders SET status=? WHERE id=?", [status,req.params.id]);
    res.json({message:'Status diperbarui'});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ─── DELETE /api/orders/:id ──────────────────────────────────
app.delete('/api/orders/:id', async (req,res) => {
  try {
    await run("DELETE FROM order_items WHERE order_id=?", [req.params.id]);
    await run("DELETE FROM orders WHERE id=?", [req.params.id]);
    res.json({message:'Pesanan dihapus'});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ─── DELETE /api/orders ──────────────────────────────────────
app.delete('/api/orders', async (req,res) => {
  try {
    await run("DELETE FROM order_items");
    await run("DELETE FROM orders");
    res.json({message:'Semua pesanan dihapus'});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ─── GET /api/stats ──────────────────────────────────────────
app.get('/api/stats', async (req,res) => {
  try {
    const {total}   = await get("SELECT COUNT(*) as total FROM orders");
    const {revenue} = await get("SELECT COALESCE(SUM(total),0) as revenue FROM orders");
    const sRows = await all("SELECT status, COUNT(*) as n FROM orders GROUP BY status");
    const mRows = await all("SELECT item_name, SUM(quantity) as total_qty FROM order_items GROUP BY item_name ORDER BY total_qty DESC");
    const byStatus={}, menuCount={};
    sRows.forEach(r=>{ byStatus[r.status]=r.n; });
    mRows.forEach(r=>{ menuCount[r.item_name]=r.total_qty; });
    res.json({total,revenue,byStatus,menuCount});
  } catch(e) { res.status(500).json({error:e.message}); }
});

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n🍕 Just Eat Me Server siap!');
  console.log('   Website  : http://localhost:'+PORT);
  console.log('   Admin    : http://localhost:'+PORT+'/admin\n');
});
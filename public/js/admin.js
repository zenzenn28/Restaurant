/* ============================================================
   Just Eat Me — admin.js
   ============================================================ */

let orders = [];
let currentFilter = 'all';
let currentOrderId = null;
let autoRefreshTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  autoRefreshTimer = setInterval(loadData, 12000);
});

// ── Navigation ─────────────────────────────────────────────
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  const titles = { dashboard:'Dashboard', orders:'Semua Pesanan', analytics:'Analitik', settings:'Pengaturan' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  loadData();
}

// ── Load data ──────────────────────────────────────────────
async function loadData() {
  try {
    const [oRes, sRes] = await Promise.all([fetch('/api/orders'), fetch('/api/stats')]);
    orders = await oRes.json();
    const stats = await sRes.json();
    document.getElementById('lastRefresh').textContent = 'Update: ' + new Date().toLocaleTimeString('id-ID');
    renderStats(stats);
    renderRecent();
    renderAll();
    renderAnalytics(stats);
    updateBadge();
  } catch (e) { console.error(e); }
}

// ── Stats ──────────────────────────────────────────────────
function renderStats({ total, revenue, byStatus }) {
  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statNew').textContent     = (byStatus.Baru || 0) + ' pesanan baru';
  document.getElementById('statProcess').textContent = byStatus.Diproses || 0;
  document.getElementById('statReady').textContent   = (byStatus.Siap || 0) + ' siap';
  document.getElementById('statDone').textContent    = byStatus.Selesai || 0;
  document.getElementById('statRevenue').textContent = fmtRp(revenue);
}

function updateBadge() {
  const n = orders.filter(o => o.status === 'Baru').length;
  const b = document.getElementById('newBadge');
  b.textContent = n; b.style.display = n > 0 ? 'inline' : 'none';
}

// ── Helpers ────────────────────────────────────────────────
const fmtRp = n => 'Rp ' + (n || 0).toLocaleString('id-ID');
const typeBadge = t => {
  const m = { 'dine-in':['type-dine','🪑 Dine In'], 'takeaway':['type-takeaway','🛍️ Takeaway'], 'delivery':['type-delivery','🛵 Delivery'] };
  const [cls, lbl] = m[t] || ['type-dine', t];
  return `<span class="type-badge ${cls}">${lbl}</span>`;
};
const statusBtn = (id, s) => `<button class="status-btn s-${s}" onclick="quickCycle(${id})">${s}</button>`;
const emptyRow  = cols => `<tr><td colspan="${cols}"><div class="empty-state"><div class="e-icon">📭</div><p>Belum ada pesanan</p></div></td></tr>`;

// ── Recent (dashboard) ─────────────────────────────────────
function renderRecent() {
  const tbody = document.getElementById('recentTbody');
  const rows  = orders.slice(0, 8);
  if (!rows.length) { tbody.innerHTML = emptyRow(7); return; }
  tbody.innerHTML = rows.map(o => `
    <tr>
      <td><span class="order-code">#${o.order_code}</span></td>
      <td><div class="cust-name">${o.cust_name}</div><div class="cust-phone">${o.cust_phone}</div></td>
      <td>${typeBadge(o.order_type)}</td>
      <td class="order-total">${fmtRp(o.total)}</td>
      <td>${statusBtn(o.id, o.status)}</td>
      <td style="font-size:.78rem;color:var(--muted)">${o.created_at}</td>
      <td><div class="action-btns">
        <button class="action-btn btn-detail" onclick="viewOrder(${o.id})">Detail</button>
        <button class="action-btn btn-del"    onclick="deleteOrder(${o.id})">Hapus</button>
      </div></td>
    </tr>`).join('');
}

// ── All orders ─────────────────────────────────────────────
function renderAll() {
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const list   = orders.filter(o => {
    const mf = currentFilter === 'all' || o.status === currentFilter;
    const ms = !search || o.cust_name.toLowerCase().includes(search) || o.order_code.toLowerCase().includes(search);
    return mf && ms;
  });
  const tbody = document.getElementById('allTbody');
  if (!list.length) { tbody.innerHTML = emptyRow(8); return; }
  tbody.innerHTML = list.map(o => {
    const summary = (o.items || []).slice(0,2).map(i=>`${i.item_name} x${i.quantity}`).join(', ')
      + ((o.items||[]).length>2?'…':'');
    return `
    <tr>
      <td><span class="order-code">#${o.order_code}</span></td>
      <td><div class="cust-name">${o.cust_name}</div><div class="cust-phone">${o.cust_phone}</div></td>
      <td style="font-size:.8rem;color:var(--muted);max-width:150px">${summary||'-'}</td>
      <td>${typeBadge(o.order_type)}</td>
      <td class="order-total">${fmtRp(o.total)}</td>
      <td>${statusBtn(o.id, o.status)}</td>
      <td style="font-size:.78rem;color:var(--muted)">${o.created_at}</td>
      <td><div class="action-btns">
        <button class="action-btn btn-detail" onclick="viewOrder(${o.id})">Detail</button>
        <button class="action-btn btn-del"    onclick="deleteOrder(${o.id})">Hapus</button>
      </div></td>
    </tr>`;
  }).join('');
}

function filterOrders(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAll();
}

// ── Detail modal ───────────────────────────────────────────
function viewOrder(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  currentOrderId = id;
  document.getElementById('mCode').textContent  = 'Order #' + o.order_code;
  document.getElementById('mTime').textContent  = o.created_at;
  document.getElementById('mCust').textContent  = o.cust_name;
  document.getElementById('mPhone').textContent = o.cust_phone;
  document.getElementById('mType').innerHTML    = typeBadge(o.order_type);
  document.getElementById('mNote').textContent  = o.note || '-';
  const addrRow = document.getElementById('mAddrRow');
  addrRow.style.display = o.order_type === 'delivery' ? 'flex' : 'none';
  document.getElementById('mAddr').textContent  = o.address || '-';
  document.getElementById('mItems').innerHTML   = (o.items || []).map(i => `
    <div class="oi-row">
      <span class="oi-name">${i.item_name}</span>
      <span class="oi-qty">x${i.quantity}</span>
      <span class="oi-price">${fmtRp(i.item_price * i.quantity)}</span>
    </div>`).join('') || '<p style="color:var(--muted)">Tidak ada item</p>';
  document.getElementById('mTotal').textContent        = fmtRp(o.total);
  document.getElementById('statusSelect').value        = o.status;
  document.getElementById('detailModal').classList.add('open');
}
function closeDetail() { document.getElementById('detailModal').classList.remove('open'); }

async function updateStatus() {
  const status = document.getElementById('statusSelect').value;
  await fetch(`/api/orders/${currentOrderId}/status`, {
    method: 'PATCH', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ status })
  });
  closeDetail(); loadData();
}

async function quickCycle(id) {
  const o     = orders.find(x => x.id === id);
  const cycle = ['Baru','Diproses','Siap','Selesai'];
  const next  = cycle[(cycle.indexOf(o.status) + 1) % cycle.length];
  await fetch(`/api/orders/${id}/status`, {
    method:'PATCH', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ status: next })
  });
  loadData();
}

async function deleteOrder(id) {
  if (!confirm('Hapus pesanan ini?')) return;
  await fetch(`/api/orders/${id}`, { method:'DELETE' });
  loadData();
}

async function deleteAllOrders() {
  if (!confirm('Hapus SEMUA pesanan? Tidak bisa dikembalikan!')) return;
  await fetch('/api/orders', { method:'DELETE' });
  loadData();
}

// ── Analytics ──────────────────────────────────────────────
function renderAnalytics({ total, revenue, byStatus, menuCount }) {
  document.getElementById('aTotal').textContent   = total;
  document.getElementById('aRevenue').textContent = fmtRp(revenue);
  document.getElementById('aAvg').textContent     = fmtRp(total ? Math.round(revenue/total) : 0);
  const sorted = Object.entries(menuCount||{}).sort((a,b)=>b[1]-a[1]);
  document.getElementById('aBest').textContent = sorted[0]?.[0]?.split(' ').slice(0,2).join(' ') || '-';

  const top5 = sorted.slice(0,5), maxM = top5[0]?.[1]||1;
  document.getElementById('menuChart').innerHTML = top5.length
    ? top5.map(([n,c])=>`<div class="bar-row"><span class="bar-label" title="${n}">${n.length>14?n.slice(0,14)+'…':n}</span><div class="bar-wrap"><div class="bar-fill" style="width:${(c/maxM*100).toFixed(0)}%"></div></div><span class="bar-val">${c} item</span></div>`).join('')
    : '<p style="color:var(--muted)">Belum ada data</p>';

  document.getElementById('cDineIn').textContent   = orders.filter(o=>o.order_type==='dine-in').length;
  document.getElementById('cTakeaway').textContent = orders.filter(o=>o.order_type==='takeaway').length;
  document.getElementById('cDelivery').textContent = orders.filter(o=>o.order_type==='delivery').length;
  document.getElementById('cDone').textContent     = byStatus.Selesai||0;

  const statuses = [{s:'Baru',c:'#F59E0B'},{s:'Diproses',c:'#3B82F6'},{s:'Siap',c:'#22C55E'},{s:'Selesai',c:'#6B7280'},{s:'Batal',c:'#EF4444'}];
  const maxS = Math.max(...statuses.map(x=>byStatus[x.s]||0),1);
  document.getElementById('statusChart').innerHTML = statuses.map(({s,c})=>{
    const n=byStatus[s]||0;
    return `<div class="bar-row"><span class="bar-label">${s}</span><div class="bar-wrap"><div class="bar-fill" style="width:${(n/maxS*100).toFixed(0)}%;background:${c}"></div></div><span class="bar-val">${n}</span></div>`;
  }).join('');
}

function toggleAutoRefresh(btn) {
  btn.classList.toggle('on');
  if (btn.classList.contains('on')) { autoRefreshTimer = setInterval(loadData, 12000); }
  else { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
}

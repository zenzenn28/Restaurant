/* ============================================================
   Just Eat Me — main.js
   ============================================================ */

let cart     = [];
let menuData = [];

// ── Admin secret: ketik "admin" di keyboard ─────────────────
const ADMIN_PASSWORD = 'admin123';
const ADMIN_TRIGGER  = 'admin';
let typedBuffer = '';
let typedTimer  = null;

document.addEventListener('keydown', (e) => {
  const tag = document.activeElement.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (!/^[a-z]$/i.test(e.key)) { typedBuffer = ''; return; }
  typedBuffer += e.key.toLowerCase();
  clearTimeout(typedTimer);
  typedTimer = setTimeout(() => { typedBuffer = ''; }, 1500);
  if (typedBuffer.includes(ADMIN_TRIGGER)) {
    typedBuffer = '';
    clearTimeout(typedTimer);
    document.getElementById('adminModal').classList.add('open');
    setTimeout(() => document.getElementById('adminPassword').focus(), 300);
  }
});

function closeAdminModal() {
  document.getElementById('adminModal').classList.remove('open');
  document.getElementById('adminPassword').value = '';
  document.getElementById('adminError').style.display = 'none';
}
function checkAdminLogin() {
  const pw = document.getElementById('adminPassword').value;
  if (pw === ADMIN_PASSWORD) {
    closeAdminModal(); window.location.href = '/admin';
  } else {
    const err = document.getElementById('adminError');
    err.style.display = 'block';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPassword').focus();
    setTimeout(() => { err.style.display = 'none'; }, 2500);
  }
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadMenu();
  initReveal();
  document.getElementById('orderType').addEventListener('change', function () {
    document.getElementById('addressGroup').style.display =
      this.value === 'delivery' ? 'block' : 'none';
  });
});

// ── Menu ───────────────────────────────────────────────────
async function loadMenu() {
  const res = await fetch('/js/menu-data.json');
  menuData  = await res.json();
  renderCards(menuData);
}

function renderCards(items) {
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = '';
  const tagClass = { pizza:'tag-pizza',pasta:'tag-pasta',coffee:'tag-coffee',mocktail:'tag-mocktail',dessert:'tag-dessert',snack:'tag-snack' };
  const tagLabel = { pizza:'🍕 Pizza',pasta:'🍝 Pasta',coffee:'☕ Kopi',mocktail:'🧃 Mocktail',dessert:'🍮 Dessert',snack:'🧀 Snack' };
  items.forEach(item => {
    const [c1,c2] = item.gradient;
    const card = document.createElement('div');
    card.className = 'menu-card visible';
    card.dataset.cat = item.category;
    card.innerHTML = `
      <div class="menu-img-wrap">
        <img class="menu-img" src="${item.img}" alt="${item.name}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="menu-img-fallback" style="background:linear-gradient(135deg,${c1},${c2})">
          <span style="font-size:3.5rem">${item.emoji}</span>
          <span style="color:#fff;font-weight:800;font-size:.85rem;margin-top:.5rem;text-align:center;padding:0 .5rem">${item.name}</span>
        </div>
      </div>
      <div class="menu-body">
        <span class="menu-cat-tag ${tagClass[item.category]}">${tagLabel[item.category]}</span>
        <div class="menu-name">${item.name}</div>
        <div class="menu-desc">${item.desc}</div>
        <div class="menu-footer">
          <span class="menu-price">Rp ${item.price.toLocaleString('id-ID')}</span>
          <button class="add-btn" onclick="addToCart(${item.id})">+ Tambah</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

function filterMenu(cat) {
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.querySelectorAll('.menu-card').forEach(c => {
    const show = cat === 'all' || c.dataset.cat === cat;
    c.classList.toggle('visible', show);
    c.style.display = show ? 'flex' : 'none';
  });
}

// ── Cart ───────────────────────────────────────────────────
function addToCart(id) {
  const item = menuData.find(m => m.id === id);
  if (!item) return;
  const ex = cart.find(c => c.id === id);
  ex ? ex.qty++ : cart.push({ ...item, qty: 1 });
  renderCart();
  showToast(`🛒 ${item.name} ditambahkan!`);
}
function changeQty(id, delta) {
  const idx = cart.findIndex(c => c.id === id);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  renderCart();
}
function renderCart() {
  const totalQty = cart.reduce((s,i) => s+i.qty, 0);
  const totalRp  = cart.reduce((s,i) => s+i.price*i.qty, 0);
  document.getElementById('cartBadge').textContent = totalQty;
  const itemsEl = document.getElementById('cartItems');
  const footer  = document.getElementById('cartFooter');
  if (!cart.length) {
    itemsEl.innerHTML = `<div class="cart-empty"><div class="e-icon">🛒</div><p>Keranjang kamu kosong</p><p style="font-size:.84rem;margin-top:.4rem;color:#C0A88E">Yuk tambah menu favorit!</p></div>`;
    footer.style.display = 'none'; return;
  }
  itemsEl.innerHTML = cart.map(item => {
    const [c1,c2] = item.gradient;
    return `<div class="cart-item">
      <div style="width:60px;height:60px;border-radius:10px;overflow:hidden;flex-shrink:0;background:linear-gradient(135deg,${c1},${c2})">
        <img src="${item.img}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">
      </div>
      <div class="ci-info"><div class="ci-name">${item.name}</div><div class="ci-price">Rp ${(item.price*item.qty).toLocaleString('id-ID')}</div></div>
      <div class="ci-qty">
        <button class="qty-btn" onclick="changeQty(${item.id},-1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${item.id},1)">+</button>
      </div>
    </div>`;
  }).join('');
  footer.style.display = 'block';
  document.getElementById('cartTotal').textContent = 'Rp ' + totalRp.toLocaleString('id-ID');
}
function toggleCart() {
  document.getElementById('cartSidebar').classList.toggle('open');
  document.getElementById('cartOverlay').classList.toggle('open');
}

// ── Checkout ───────────────────────────────────────────────
function showCheckout() {
  if (!cart.length) return showToast('Keranjang masih kosong!');
  toggleCart();
  setTimeout(() => document.getElementById('orderModal').classList.add('open'), 320);
}
function closeModal() { document.getElementById('orderModal').classList.remove('open'); }

async function submitOrder() {
  const cust_name  = document.getElementById('custName').value.trim();
  const cust_phone = document.getElementById('custPhone').value.trim();
  const order_type = document.getElementById('orderType').value;
  const address    = document.getElementById('custAddress').value.trim();
  const note       = document.getElementById('custNote').value.trim();
  if (!cust_name)  return showToast('⚠️ Nama wajib diisi!');
  if (!cust_phone) return showToast('⚠️ No. HP wajib diisi!');
  if (order_type === 'delivery' && !address) return showToast('⚠️ Alamat wajib diisi!');
  try {
    const res = await fetch('/api/orders', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ cust_name, cust_phone, order_type, address, note,
        items: cart.map(i => ({ name:i.name, price:i.price, qty:i.qty }))
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memesan');
    closeModal();
    const code = data.order_code;
    lastOrderCode = code;
    document.getElementById('orderCode').textContent = 'Order #' + code;
    document.getElementById('successOverlay').classList.add('open');
    // simpan order code untuk tombol "Cek Status"
    document.getElementById('successOverlay').dataset.code = code;
    cart = []; renderCart();
    ['custName','custPhone','custNote','custAddress'].forEach(id => { document.getElementById(id).value=''; });
  } catch(err) { showToast('❌ ' + err.message); }
}

let lastOrderCode = '';

function closeSuccess() { document.getElementById('successOverlay').classList.remove('open'); }
function closeSuccessAndTrack() {
  closeSuccess();
  setTimeout(() => openTrackWithCode(lastOrderCode), 200);
}

// ── Track Order ────────────────────────────────────────────
function openTrack() {
  document.getElementById('trackModal').classList.add('open');
  document.getElementById('trackResult').style.display = 'none';
  document.getElementById('trackError').style.display  = 'none';
  document.getElementById('trackInput').value = '';
  setTimeout(() => document.getElementById('trackInput').focus(), 300);
}
function closeTrack() { document.getElementById('trackModal').classList.remove('open'); }

// Buka langsung dengan order code (dari success modal)
function openTrackWithCode(code) {
  openTrack();
  document.getElementById('trackInput').value = code;
  setTimeout(doTrack, 350);
}

async function doTrack() {
  const code = document.getElementById('trackInput').value.trim();
  if (!code) return;

  const errEl = document.getElementById('trackError');
  const resEl = document.getElementById('trackResult');
  errEl.style.display = 'none';
  resEl.style.display  = 'none';

  try {
    const res  = await fetch('/api/track/' + encodeURIComponent(code));
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent    = '❌ ' + data.error;
      errEl.style.display  = 'block';
      return;
    }
    renderTrackResult(data);
    resEl.style.display = 'block';
  } catch(e) {
    errEl.textContent   = '❌ Gagal menghubungi server. Coba lagi.';
    errEl.style.display = 'block';
  }
}

function renderTrackResult(order) {
  // Header
  document.getElementById('trOrderId').textContent   = '#' + order.order_code;
  document.getElementById('trTotal').textContent     = 'Rp ' + order.total.toLocaleString('id-ID');
  const typeLabel = { 'dine-in':'🪑 Dine In', 'takeaway':'🛍️ Takeaway', 'delivery':'🛵 Delivery' };
  document.getElementById('trOrderMeta').textContent =
    order.cust_name + ' · ' + (typeLabel[order.order_type]||order.order_type) + ' · ' + order.created_at;

  // Progress steps
  const steps   = ['Baru','Diproses','Siap','Selesai'];
  const status  = order.status;
  const curIdx  = steps.indexOf(status);
  const isBatal = status === 'Batal';

  steps.forEach((s, i) => {
    const el   = document.getElementById('step-' + s);
    const line = document.getElementById('line-' + (i + 1));
    el.className = 'track-step';
    if (isBatal) {
      el.classList.add(i === 0 ? 'cancelled' : '');
    } else if (i < curIdx) {
      el.classList.add('done');
      if (line) line.classList.add('done');
    } else if (i === curIdx) {
      el.classList.add('active');
    }
    if (line && !isBatal) {
      line.classList.toggle('done', i < curIdx);
    }
  });

  // Badge & message
  const msgs = {
    'Baru':     '⏳ Pesanan kamu sudah kami terima dan segera diproses!',
    'Diproses': '👨‍🍳 Chef sedang memasak pesanan kamu. Harap tunggu sebentar!',
    'Siap':     '✅ Pesanan kamu sudah siap! Silakan diambil atau menunggu pengantar.',
    'Selesai':  '🎉 Pesanan selesai. Terima kasih sudah makan di Just Eat Me!',
    'Batal':    '❌ Pesanan ini telah dibatalkan.',
  };
  const badge = document.getElementById('trStatusBadge');
  badge.textContent  = status;
  badge.className    = 'track-status-badge badge-' + status;
  document.getElementById('trStatusMsg').textContent = msgs[status] || '';

  // Items
  document.getElementById('trItems').innerHTML = order.items.map(i => `
    <div class="track-item">
      <div>
        <div class="track-item-name">${i.item_name}</div>
        <div class="track-item-qty">x${i.quantity}</div>
      </div>
      <div class="track-item-price">Rp ${(i.item_price * i.quantity).toLocaleString('id-ID')}</div>
    </div>`).join('');
}

function closeSuccessAndTrack() {
  const code = document.getElementById('successOverlay').dataset.code || '';
  closeSuccess();
  openTrackModal(code);
}

// ── Track Order ────────────────────────────────────────────
let trackPollInterval = null;
let currentTrackCode  = '';

function openTrackModal(prefill = '') {
  document.getElementById('trackModal').classList.add('open');
  document.getElementById('trackInput').value = prefill;
  document.getElementById('trackError').style.display  = 'none';
  document.getElementById('trackResult').style.display = 'none';
  if (prefill) searchOrder();
}

function closeTrackModal() {
  document.getElementById('trackModal').classList.remove('open');
  clearInterval(trackPollInterval);
  trackPollInterval = null;
  currentTrackCode  = '';
}

async function searchOrder() {
  const code = document.getElementById('trackInput').value.trim().toUpperCase();
  if (!code) return;
  clearInterval(trackPollInterval);
  await fetchAndRenderTrack(code);
  // Auto-refresh setiap 15 detik
  trackPollInterval = setInterval(() => fetchAndRenderTrack(code), 15000);
  currentTrackCode  = code;
}

async function fetchAndRenderTrack(code) {
  const errEl    = document.getElementById('trackError');
  const resultEl = document.getElementById('trackResult');
  try {
    const res  = await fetch('/api/track/' + encodeURIComponent(code));
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent    = data.error || 'Pesanan tidak ditemukan.';
      errEl.style.display  = 'block';
      resultEl.style.display = 'none';
      return;
    }
    errEl.style.display  = 'none';
    renderTrackResult(data);
    resultEl.style.display = 'block';
  } catch(e) {
    errEl.textContent   = '⚠️ Gagal menghubungi server. Coba lagi.';
    errEl.style.display = 'block';
  }
}

const STATUS_ORDER = ['Baru','Diproses','Siap','Selesai'];
const TYPE_LABEL   = { 'dine-in':'🪑 Dine In', 'takeaway':'🛍️ Takeaway', 'delivery':'🛵 Delivery' };

function renderTrackResult(order) {
  // Info baris atas
  document.getElementById('trCode').textContent  = '#' + order.order_code;
  document.getElementById('trName').textContent  = '👤 ' + order.cust_name;
  document.getElementById('trType').textContent  = TYPE_LABEL[order.order_type] || order.order_type;
  document.getElementById('trTime').textContent  = '🕐 ' + order.created_at;
  document.getElementById('trTotal').textContent = 'Rp ' + Number(order.total).toLocaleString('id-ID');

  const isBatal  = order.status === 'Batal';
  const curIdx   = STATUS_ORDER.indexOf(order.status);

  // Progress steps
  STATUS_ORDER.forEach((s, i) => {
    const stepEl = document.getElementById('ps-' + s);
    const lineEl = document.getElementById('pl-' + (i+1));
    stepEl.className = 'progress-step';
    if (isBatal) {
      // semua abu-abu
    } else if (i < curIdx) {
      stepEl.classList.add('done');
      if (lineEl) lineEl.classList.add('done');
    } else if (i === curIdx) {
      stepEl.classList.add('active');
    }
    if (lineEl) {
      lineEl.className = 'progress-line';
      if (!isBatal && i < curIdx) lineEl.classList.add('done');
    }
  });

  // Batal box
  document.getElementById('track-batal-box').style.display = isBatal ? 'block' : 'none';

  // Badge status
  const badge = document.getElementById('trStatusBadge');
  badge.textContent = order.status;
  badge.className   = 'track-status-badge badge-status-' + order.status;

  // Items
  document.getElementById('trItems').innerHTML = (order.items || []).map(it => `
    <div class="track-item">
      <span class="track-item-name">${it.item_name}</span>
      <span class="track-item-qty">x${it.quantity}</span>
      <span class="track-item-price">Rp ${(it.item_price * it.quantity).toLocaleString('id-ID')}</span>
    </div>`).join('');
}

// ── Helpers ────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}
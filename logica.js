let STATE = {
  loggedIn: false,
  products: [],
  soldProducts: [],
  proposals: [],
  settings: { name: 'Pereira & Alem', phone: '', email: '', pass: 'admin123' },
  tempImgs: [],
  propSellImg: null,
  editingProductId: null,
  currentProposalProductId: null,
};

function save() { localStorage.setItem('moveis_state', JSON.stringify(STATE)); }
function load() {
  const s = localStorage.getItem('moveis_state');
  if (s) { const d = JSON.parse(s); STATE = { ...STATE, ...d, tempImgs: [], propSellImg: null }; }
}

// ===================== BOOT =====================
load();
if (!STATE.settings) STATE.settings = { name: 'Pereira & Alem', phone: '', email: '', pass: 'admin123' };

// Sidebar settings link
document.querySelector('.sidebar-footer').innerHTML += `
  <button class="logout-btn" onclick="openSettingsModal()" style="margin-top:8px;">
    <span class="icon">⚙️</span><span>Configurações</span>
  </button>`;

// ===================== AUTH =====================
function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  if (u === 'admin' && p === (STATE.settings?.pass || 'admin123')) {
    STATE.loggedIn = true;
    document.getElementById('page-login').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    showPage('dashboard');
    updateStats();
    renderProducts();
    renderSold();
    toast('Bem-vindo! 👋', 'success');
  } else {
    toast('Usuário ou senha incorretos', 'error');
  }
}
function doLogout() {
  STATE.loggedIn = false;
  document.getElementById('app').style.display = 'none';
  document.getElementById('page-login').style.display = 'flex';
  document.getElementById('login-pass').value = '';
}
function showLoginFromCatalog() {
  document.getElementById('page-login').style.display = 'flex';
  showPageAdmin('dashboard');
}

// ===================== NAVIGATION =====================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  if (pg) pg.classList.add('active');
  const nav = document.querySelector(`[data-page="${name}"]`);
  if (nav) nav.classList.add('active');
  if (name === 'catalog') { renderCatalog(); renderCatalogFilters(); }
  if (name === 'dashboard') { updateStats(); renderDashRecent(); }
  if (name === 'products') { renderProducts(); renderProductFilters(); }
  if (name === 'sold') renderSold();
}
function showPageAdmin(name) {
  document.getElementById('page-login').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  showPage(name);
}

// ===================== TOAST =====================
function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ===================== MODALS =====================
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ===================== IMAGE HANDLING =====================
function handleImgs(e) {
  const files = Array.from(e.target.files);
  files.forEach(f => {
    const r = new FileReader();
    r.onload = ev => {
      STATE.tempImgs.push(ev.target.result);
      renderImgPreview();
    };
    r.readAsDataURL(f);
  });
}
function renderImgPreview() {
  const el = document.getElementById('img-preview-list');
  el.innerHTML = STATE.tempImgs.map((src, i) =>
    `<img class="img-thumb" src="${src}" title="Foto ${i + 1}">`
  ).join('');
}
function handleProposeSellImg(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    STATE.propSellImg = ev.target.result;
    document.getElementById('prop-sell-img-preview').innerHTML =
      `<img class="img-thumb" src="${STATE.propSellImg}" style="margin-top:8px;">`;
  };
  r.readAsDataURL(f);
}

// ===================== PRODUCTS =====================
function openModal_product() {
  STATE.tempImgs = [];
  STATE.editingProductId = null;
  document.getElementById('modal-product-title').textContent = 'Novo Produto';
  document.getElementById('product-id').value = '';
  ['p-name', 'p-cost', 'p-price', 'p-desc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('p-room').value = '';
  document.getElementById('p-type').value = '';
  document.getElementById('img-preview-list').innerHTML = '';
  openModal('modal-product');
}

function saveProduct() {
  const name = document.getElementById('p-name').value.trim();
  const room = document.getElementById('p-room').value;
  const type = document.getElementById('p-type').value;
  const cost = parseFloat(document.getElementById('p-cost').value);
  const price = parseFloat(document.getElementById('p-price').value);
  const desc = document.getElementById('p-desc').value.trim();

  if (!name || !room || !type || isNaN(cost) || isNaN(price)) {
    toast('Preencha todos os campos obrigatórios (*)', 'error'); return;
  }
  if (STATE.tempImgs.length === 0 && !STATE.editingProductId) {
    toast('Adicione ao menos uma foto!', 'error'); return;
  }

  const editId = document.getElementById('product-id').value;
  if (editId) {
    const idx = STATE.products.findIndex(p => p.id === editId);
    if (idx >= 0) {
      STATE.products[idx] = {
        ...STATE.products[idx], name, room, type, cost, price, desc,
        imgs: STATE.tempImgs.length ? STATE.tempImgs : STATE.products[idx].imgs
      };
      toast('Produto atualizado!', 'success');
    }
  } else {
    const product = { id: Date.now().toString(), name, room, type, cost, price, desc, imgs: STATE.tempImgs, date: new Date().toLocaleDateString('pt-BR'), sold: false };
    STATE.products.unshift(product);
    toast('Produto cadastrado! 🎉', 'success');
  }
  save();
  closeModal('modal-product');
  renderProducts();
  renderDashRecent();
  updateStats();
  STATE.tempImgs = [];
}

function editProduct(id) {
  const p = STATE.products.find(x => x.id === id);
  if (!p) return;
  STATE.editingProductId = id;
  STATE.tempImgs = [...(p.imgs || [])];
  document.getElementById('modal-product-title').textContent = 'Editar Produto';
  document.getElementById('product-id').value = id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-room').value = p.room;
  document.getElementById('p-type').value = p.type;
  document.getElementById('p-cost').value = p.cost;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-desc').value = p.desc || '';
  renderImgPreview();
  openModal('modal-product');
}

function deleteProduct(id) {
  if (!confirm('Excluir produto?')) return;
  STATE.products = STATE.products.filter(p => p.id !== id);
  save(); renderProducts(); updateStats(); toast('Produto excluído');
}

function openSellModal(id) {
  const p = STATE.products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('sell-product-id').value = id;
  document.getElementById('sell-final-price').value = p.price;
  openModal('modal-sell');
}

function confirmSell() {
  const id = document.getElementById('sell-product-id').value;
  const finalPrice = parseFloat(document.getElementById('sell-final-price').value);
  const p = STATE.products.find(x => x.id === id);
  if (!p) return;
  const sold = { ...p, sold: true, soldPrice: finalPrice, profit: finalPrice - p.cost, soldDate: new Date().toLocaleDateString('pt-BR') };
  STATE.soldProducts.unshift(sold);
  STATE.products = STATE.products.filter(x => x.id !== id);
  save(); closeModal('modal-sell'); renderProducts(); renderSold(); updateStats();
  toast(`Venda registrada! Lucro: R$ ${(finalPrice - p.cost).toFixed(2)} 💰`, 'success');
}

// ===================== RENDER PRODUCTS =====================
function getAvailableProducts() { return STATE.products.filter(p => !p.sold); }

function renderProductFilters() {
  const rooms = [...new Set(getAvailableProducts().map(p => p.room))];
  const types = [...new Set(getAvailableProducts().map(p => p.type))];
  ['filter-room', 'filter-catalog-room'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const cur = el.value;
    el.innerHTML = '<option value="">Todos os cômodos</option>' + rooms.map(r => `<option ${r === cur ? 'selected' : ''}>${r}</option>`).join('');
  });
  ['filter-type', 'filter-catalog-type'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const cur = el.value;
    el.innerHTML = '<option value="">Todos os tipos</option>' + types.map(t => `<option ${t === cur ? 'selected' : ''}>${t}</option>`).join('');
  });
}

function getFilteredProducts(searchId, roomId, typeId) {
  const q = (document.getElementById(searchId)?.value || '').toLowerCase();
  const room = document.getElementById(roomId)?.value || '';
  const type = document.getElementById(typeId)?.value || '';
  return getAvailableProducts().filter(p => {
    const matchQ = !q || p.name.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q);
    const matchRoom = !room || p.room === room;
    const matchType = !type || p.type === type;
    return matchQ && matchRoom && matchType;
  });
}

function productCard(p, isAdmin) {
  const img = p.imgs && p.imgs[0] ? `<img src="${p.imgs[0]}" alt="${p.name}">` : `<span>🛋️</span>`;
  const adminBtns = isAdmin ? `
    <button class="btn btn-ghost btn-sm" onclick="viewProductDetail('${p.id}')">👁️ Ver</button>
    <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">✏️ Editar</button>
    <button class="btn btn-success btn-sm" onclick="openSellModal('${p.id}')">✅ Vendido</button>
    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">🗑️</button>
  ` : `
    <button class="btn btn-accent btn-sm" onclick="openPropose('${p.id}')">📋 Proposta / Vender</button>
  `;
  return `
    <div class="product-card">
      <div class="product-img">${img}</div>
      <div class="product-body">
        <div class="product-badges">
          <span class="badge badge-room">${p.room}</span>
          <span class="badge badge-type">${p.type}</span>
          <span class="badge badge-available">Disponível</span>
        </div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">R$ ${parseFloat(p.price).toFixed(2)}</div>
        ${p.desc ? `<div class="product-desc">${p.desc.substring(0, 80)}${p.desc.length > 80 ? '...' : ''}</div>` : ''}
        ${isAdmin ? `<div style="font-size:12px;color:var(--text2);margin-top:6px;">Custo: R$ ${parseFloat(p.cost).toFixed(2)} | Lucro prev.: <b style="color:var(--success)">R$ ${(p.price - p.cost).toFixed(2)}</b></div>` : ''}
        <div class="product-actions">${adminBtns}</div>
      </div>
    </div>`;
}

function renderProducts() {
  renderProductFilters();
  const list = getFilteredProducts('search-products', 'filter-room', 'filter-type');
  const el = document.getElementById('products-list');
  if (!list.length) { el.innerHTML = '<div class="empty-state"><div class="icon">📦</div><p>Nenhum produto encontrado</p></div>'; return; }
  el.innerHTML = list.map(p => productCard(p, true)).join('');
}

function renderDashRecent() {
  const el = document.getElementById('dash-recent');
  const list = getAvailableProducts().slice(0, 6);
  if (!list.length) { el.innerHTML = '<div class="empty-state"><div class="icon">📦</div><p>Nenhum produto cadastrado ainda</p></div>'; return; }
  el.innerHTML = list.map(p => productCard(p, true)).join('');
}

function renderCatalogFilters() {
  renderProductFilters();
  // contact info
  const s = STATE.settings;
  const info = document.getElementById('catalog-contact-info');
  if (info) {
    info.innerHTML = [
      s.phone ? `<div class="catalog-contact-item">📞 ${s.phone}</div>` : '',
      s.email ? `<div class="catalog-contact-item">✉️ ${s.email}</div>` : '',
    ].join('');
  }
}

function renderCatalog() {
  const list = getFilteredProducts('search-catalog', 'filter-catalog-room', 'filter-catalog-type');
  const el = document.getElementById('catalog-list');
  if (!list.length) { el.innerHTML = '<div class="empty-state"><div class="icon">🛋️</div><p>Nenhum produto disponível no momento</p></div>'; return; }
  el.innerHTML = list.map(p => productCard(p, false)).join('');
}

// ===================== SOLD =====================
function renderSold() {
  const tbody = document.getElementById('sold-list');
  if (!STATE.soldProducts.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:32px;">Nenhuma venda registrada ainda</td></tr>';
    return;
  }
  tbody.innerHTML = STATE.soldProducts.map(p => {
    const profitClass = p.profit >= 0 ? 'profit-positive' : 'profit-negative';
    return `<tr>
      <td><b>${p.name}</b></td>
      <td>${p.room} / ${p.type}</td>
      <td>R$ ${parseFloat(p.cost).toFixed(2)}</td>
      <td>R$ ${parseFloat(p.soldPrice).toFixed(2)}</td>
      <td class="${profitClass}">R$ ${parseFloat(p.profit).toFixed(2)}</td>
      <td>${p.soldDate}</td>
    </tr>`;
  }).join('');
}

// ===================== STATS =====================
function updateStats() {
  const avail = getAvailableProducts();
  const totalProfit = STATE.soldProducts.reduce((a, p) => a + (p.profit || 0), 0);
  const invested = avail.reduce((a, p) => a + p.cost, 0);
  document.getElementById('stat-available').textContent = avail.length;
  document.getElementById('stat-profit').textContent = 'R$ ' + totalProfit.toFixed(2);
  document.getElementById('stat-sold-count').textContent = STATE.soldProducts.length;
  document.getElementById('stat-invested').textContent = 'R$ ' + invested.toFixed(2);
}

// ===================== PROPOSALS =====================
function openPropose(productId) {
  STATE.currentProposalProductId = productId;
  STATE.propSellImg = null;
  const p = STATE.products.find(x => x.id === productId);
  ['prop-name', 'prop-phone', 'prop-email', 'prop-msg'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('prop-type').value = 'compra';
  document.getElementById('prop-sell-desc').value = '';
  document.getElementById('prop-sell-value').value = '';
  document.getElementById('prop-sell-img-preview').innerHTML = '';
  toggleSellExtra();
  const info = document.getElementById('propose-product-info');
  if (p) {
    const img = p.imgs && p.imgs[0] ? `<img src="${p.imgs[0]}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;float:left;margin-right:12px;">` : '🛋️';
    info.innerHTML = `${img}<b>${p.name}</b><br><span style="color:var(--text2)">${p.room} • ${p.type}</span><br><b style="color:var(--accent)">R$ ${parseFloat(p.price).toFixed(2)}</b>`;
  }
  openModal('modal-propose');
}

document.getElementById('prop-type').addEventListener('change', toggleSellExtra);
function toggleSellExtra() {
  const v = document.getElementById('prop-type').value;
  document.getElementById('sell-extra').style.display = v === 'venda' ? 'block' : 'none';
}

function submitProposal() {
  const name = document.getElementById('prop-name').value.trim();
  const phone = document.getElementById('prop-phone').value.trim();
  const email = document.getElementById('prop-email').value.trim();
  const type = document.getElementById('prop-type').value;
  const msg = document.getElementById('prop-msg').value.trim();
  if (!name || !phone) { toast('Nome e telefone são obrigatórios!', 'error'); return; }
  const proposal = {
    id: Date.now().toString(), productId: STATE.currentProposalProductId,
    name, phone, email, type, msg, date: new Date().toLocaleDateString('pt-BR'), status: 'pendente',
    sellDesc: type === 'venda' ? document.getElementById('prop-sell-desc').value : '',
    sellValue: type === 'venda' ? document.getElementById('prop-sell-value').value : '',
    sellImg: type === 'venda' ? STATE.propSellImg : null,
  };
  STATE.proposals.push(proposal);
  save(); closeModal('modal-propose');
  toast('Proposta enviada! Entraremos em contato. 📨', 'success');
}

// ===================== VIEW DETAIL =====================
function viewProductDetail(id) {
  const p = STATE.products.find(x => x.id === id);
  if (!p) return;
  const relProposals = STATE.proposals.filter(r => r.productId === id);
  const imgs = (p.imgs || []).map(src => `<img src="${src}" style="width:100px;height:80px;object-fit:cover;border-radius:8px;">`).join('');
  const propsHtml = relProposals.length ? relProposals.map(pr => `
    <div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">
      <b>${pr.name}</b> — ${pr.type === 'compra' ? '🛒 Compra' : '📦 Venda'}<br>
      <span style="font-size:13px;color:var(--text2)">📞 ${pr.phone}${pr.email ? ' | ✉️ ' + pr.email : ''}</span><br>
      ${pr.msg ? `<span style="font-size:13px;">${pr.msg}</span><br>` : ''}
      ${pr.type === 'venda' && pr.sellDesc ? `<div style="margin-top:6px;font-size:13px;background:var(--bg);padding:8px;border-radius:6px;"><b>Produto p/ vender:</b> ${pr.sellDesc}${pr.sellValue ? ' — R$ ' + pr.sellValue : ''}</div>` : ''}
      ${pr.sellImg ? `<img src="${pr.sellImg}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin-top:6px;">` : ''}
      <div style="font-size:11px;color:var(--text2);margin-top:4px;">${pr.date}</div>
    </div>
  `).join('') : '<p style="color:var(--text2);font-size:13px;">Nenhuma proposta recebida</p>';

  document.getElementById('modal-detail-content').innerHTML = `
    <h2 style="font-family:'Playfair Display',serif;color:var(--wood-dark);">${p.name}</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;">${imgs}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;">
      <div><b>Cômodo:</b> ${p.room}</div>
      <div><b>Tipo:</b> ${p.type}</div>
      <div><b>Custo:</b> R$ ${parseFloat(p.cost).toFixed(2)}</div>
      <div><b>Preço:</b> R$ ${parseFloat(p.price).toFixed(2)}</div>
      <div><b>Lucro prev.:</b> <span style="color:var(--success);font-weight:700">R$ ${(p.price - p.cost).toFixed(2)}</span></div>
      <div><b>Cadastrado:</b> ${p.date || '—'}</div>
    </div>
    ${p.desc ? `<div style="background:var(--bg);padding:12px;border-radius:8px;font-size:14px;color:var(--text2);margin-bottom:16px;">${p.desc}</div>` : ''}
    <h3 style="font-family:'Playfair Display',serif;margin-bottom:10px;">📋 Propostas (${relProposals.length})</h3>
    ${propsHtml}
  `;
  openModal('modal-detail');
}

// ===================== SETTINGS =====================
function openSettingsModal() {
  document.getElementById('set-name').value = STATE.settings.name || '';
  document.getElementById('set-phone').value = STATE.settings.phone || '';
  document.getElementById('set-email').value = STATE.settings.email || '';
  document.getElementById('set-pass').value = '';
  openModal('modal-settings');
}
function saveSettings() {
  STATE.settings.name = document.getElementById('set-name').value.trim() || 'Móveis & Cia';
  STATE.settings.phone = document.getElementById('set-phone').value.trim();
  STATE.settings.email = document.getElementById('set-email').value.trim();
  const np = document.getElementById('set-pass').value;
  if (np) STATE.settings.pass = np;
  save(); closeModal('modal-settings');
  toast('Configurações salvas!', 'success');
}

// ===================== INIT =====================
// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('active'); });
});

// Override new product button to reset form
document.querySelectorAll('[onclick="openModal(\'modal-product\')"]').forEach(btn => {
  btn.setAttribute('onclick', 'openModal_product()');
});
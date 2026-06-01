// ===================== SUPABASE =====================
const SUPABASE_URL = 'https://mwzkhjnzvfhcarnifgxa.supabase.co'
const SUPABASE_KEY = 'sb_publishable_4Lrj5afQdnT9v5tTCP942g_KEpJfU5D'
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// ===================== STATE =====================
let STATE = {
  products: [], soldProducts: [], proposals: [],
  settings: { name: 'Pereira & Alem', phone: '', email: '' },
  tempImgs: [], propSellImg: null,
  editingProductId: null, currentProposalProductId: null,
}

// ===================== BOOT =====================
document.addEventListener('DOMContentLoaded', async () => {
  // Corrige altura no Safari iOS
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  window.addEventListener('resize', () => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  });

  // Botão de configurações na sidebar
  document.querySelector('.sidebar-footer').innerHTML += `
    <button class="logout-btn" onclick="openSettingsModal()" style="margin-top:8px;">
      <span class="icon">⚙️</span><span>Configurações</span>
    </button>`

  // Fecha modais ao clicar fora
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('active') })
  })

  // Listener do select de proposta
  document.getElementById('prop-type').addEventListener('change', toggleSellExtra)

  // Sobrescreve botões de novo produto
  document.querySelectorAll('[onclick="openModal(\'modal-product\')"]').forEach(btn => {
    btn.setAttribute('onclick', 'openProductModal()')
  })

  // Verifica sessão ativa
  const { data: { session } } = await _supabase.auth.getSession()
  if (session) entrarNoApp()
})

// ===================== AUTH =====================
async function doLogin() {
  const email = document.getElementById('login-user').value.trim()
  const pass = document.getElementById('login-pass').value
  if (!email || !pass) { toast('Preencha e-mail e senha', 'error'); return }

  const { error } = await _supabase.auth.signInWithPassword({ email, password: pass })
  if (error) {
    toast('E-mail ou senha incorretos', 'error')
  } else {
    entrarNoApp()
  }
}

async function doLogout() {
  await _supabase.auth.signOut()
  STATE.products = []
  STATE.soldProducts = []
  document.getElementById('app').style.display = 'none'
  document.getElementById('page-login').style.display = 'flex'
  document.getElementById('login-pass').value = ''
}

function entrarNoApp() {
  document.getElementById('page-login').style.display = 'none'
  document.getElementById('app').style.display = 'flex'
  showPage('dashboard')
  toast('Bem-vindo! 👋', 'success')
}

// ===================== NAVIGATION =====================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
  const pg = document.getElementById('page-' + name)
  if (pg) pg.classList.add('active')
  const nav = document.querySelector(`[data-page="${name}"]`)
  if (nav) nav.classList.add('active')

  if (name === 'catalog') carregarProdutos().then(() => { renderCatalogFilters(); renderCatalog() })
  if (name === 'dashboard') carregarProdutos().then(() => { updateStats(); renderDashRecent() })
  if (name === 'products') carregarProdutos().then(() => { renderProductFilters(); renderProducts() })
  if (name === 'sold') carregarVendas().then(renderSold)
}

// ===================== TOAST =====================
function toast(msg, type = '') {
  const c = document.getElementById('toast-container')
  const t = document.createElement('div')
  t.className = 'toast ' + type
  t.textContent = msg
  c.appendChild(t)
  setTimeout(() => t.remove(), 3200)
}

// ===================== MODALS =====================
function openModal(id) { document.getElementById(id).classList.add('active') }
function closeModal(id) { document.getElementById(id).classList.remove('active') }

// ===================== BANCO DE DADOS =====================
async function carregarProdutos() {
  const { data, error } = await _supabase
    .from('produtos')
    .select('*')
    .eq('vendido', false)
    .order('criado_em', { ascending: false })
  if (error) { toast('Erro ao carregar produtos', 'error'); return }
  STATE.products = data || []
}

async function carregarVendas() {
  const { data, error } = await _supabase
    .from('vendas')
    .select('*')
    .order('vendido_em', { ascending: false })
  if (error) { toast('Erro ao carregar vendas', 'error'); return }
  STATE.soldProducts = data || []
}

async function carregarPropostas(productId) {
  const { data, error } = await _supabase
    .from('propostas')
    .select('*')
    .eq('produto_id', productId)
    .order('criado_em', { ascending: false })
  if (error) { toast('Erro ao carregar propostas', 'error'); return [] }
  return data || []
}

// ===================== IMAGES =====================
function handleImgs(e) {
  Array.from(e.target.files).forEach(f => {
    const r = new FileReader()
    r.onload = ev => { STATE.tempImgs.push(ev.target.result); renderImgPreview() }
    r.readAsDataURL(f)
  })
}

function renderImgPreview() {
  document.getElementById('img-preview-list').innerHTML =
    STATE.tempImgs.map((src, i) => `<img class="img-thumb" src="${src}" title="Foto ${i + 1}">`).join('')
}

function handleProposeSellImg(e) {
  const f = e.target.files[0]
  if (!f) return
  const r = new FileReader()
  r.onload = ev => {
    STATE.propSellImg = ev.target.result
    document.getElementById('prop-sell-img-preview').innerHTML =
      `<img class="img-thumb" src="${STATE.propSellImg}" style="margin-top:8px;">`
  }
  r.readAsDataURL(f)
}

// ===================== PRODUCTS =====================
function openProductModal() {
  STATE.tempImgs = []
  STATE.editingProductId = null
  document.getElementById('modal-product-title').textContent = 'Novo Produto'
  document.getElementById('product-id').value = ''
    ;['p-name', 'p-cost', 'p-price', 'p-desc'].forEach(id => document.getElementById(id).value = '')
  document.getElementById('p-room').value = ''
  document.getElementById('p-type').value = ''
  document.getElementById('img-preview-list').innerHTML = ''
  openModal('modal-product')
}

async function saveProduct() {
  const nome = document.getElementById('p-name').value.trim()
  const comodo = document.getElementById('p-room').value
  const tipo = document.getElementById('p-type').value
  const custo = parseFloat(document.getElementById('p-cost').value)
  const preco = parseFloat(document.getElementById('p-price').value)
  const descricao = document.getElementById('p-desc').value.trim()

  if (!nome || !comodo || !tipo || isNaN(custo) || isNaN(preco)) {
    toast('Preencha todos os campos obrigatórios (*)', 'error'); return
  }
  if (STATE.tempImgs.length === 0 && !STATE.editingProductId) {
    toast('Adicione ao menos uma foto!', 'error'); return
  }

  const editId = document.getElementById('product-id').value

  if (editId) {
    const atualizacao = { nome, comodo, tipo, custo, preco, descricao }
    if (STATE.tempImgs.length) atualizacao.fotos = STATE.tempImgs
    const { error } = await _supabase.from('produtos').update(atualizacao).eq('id', editId)
    if (error) { toast('Erro ao atualizar produto', 'error'); return }
    toast('Produto atualizado!', 'success')
  } else {
    const { error } = await _supabase.from('produtos').insert({
      nome, comodo, tipo, custo, preco, descricao, fotos: STATE.tempImgs, vendido: false
    })
    if (error) { toast('Erro ao cadastrar produto', 'error'); return }
    toast('Produto cadastrado! 🎉', 'success')
  }

  STATE.tempImgs = []
  closeModal('modal-product')
  await carregarProdutos()
  renderProducts()
  renderDashRecent()
  updateStats()
}

function editProduct(id) {
  const p = STATE.products.find(x => x.id === id)
  if (!p) return
  STATE.editingProductId = id
  STATE.tempImgs = [...(p.fotos || [])]
  document.getElementById('modal-product-title').textContent = 'Editar Produto'
  document.getElementById('product-id').value = id
  document.getElementById('p-name').value = p.nome
  document.getElementById('p-room').value = p.comodo
  document.getElementById('p-type').value = p.tipo
  document.getElementById('p-cost').value = p.custo
  document.getElementById('p-price').value = p.preco
  document.getElementById('p-desc').value = p.descricao || ''
  renderImgPreview()
  openModal('modal-product')
}

async function deleteProduct(id) {
  if (!confirm('Excluir produto?')) return
  const { error } = await _supabase.from('produtos').delete().eq('id', id)
  if (error) { toast('Erro ao excluir produto', 'error'); return }
  await carregarProdutos()
  renderProducts()
  updateStats()
  toast('Produto excluído')
}

function openSellModal(id) {
  const p = STATE.products.find(x => x.id === id)
  if (!p) return
  document.getElementById('sell-product-id').value = id
  document.getElementById('sell-final-price').value = p.preco
  openModal('modal-sell')
}

// ===================== GOOGLE SHEETS =====================
async function enviarParaSheets(dados) {
  try {
    await fetch('https://script.google.com/macros/s/AKfycbwj3muZ5EMb732a2n8imLHlWgNhcJzOPr0EgsqT0q2v9Fl_PiPSjlDO9oqg9u72ushBew/exec', {
      method: 'POST',
      body: JSON.stringify(dados)
    })
  } catch (erro) {
    console.error('Erro ao enviar para Sheets:', erro)
  }
}

async function confirmSell() {
  const id = document.getElementById('sell-product-id').value
  const precoVenda = parseFloat(document.getElementById('sell-final-price').value)
  const p = STATE.products.find(x => x.id === id)
  if (!p) return

  const lucro = precoVenda - p.custo

  const { error: erroVenda } = await _supabase.from('vendas').insert({
    produto_id: p.id,
    nome_produto: p.nome,
    comodo: p.comodo,
    tipo: p.tipo,
    custo: p.custo,
    preco_sugerido: p.preco,
    preco_venda: precoVenda,
    lucro
  })
  if (erroVenda) { toast('Erro ao registrar venda', 'error'); return }

  const { error: erroProduto } = await _supabase.from('produtos').update({ vendido: true }).eq('id', id)
  if (erroProduto) { toast('Erro ao atualizar produto', 'error'); return }

  closeModal('modal-sell')
  await carregarProdutos()
  await carregarVendas()
  renderProducts()
  renderSold()
  updateStats()
  // Envia para o Google Sheets
  await enviarParaSheets({
    produto: p.nome,
    custo: p.custo,
    precoVenda: precoVenda,
    lucro: lucro
  })
  toast(`Venda registrada! Lucro: R$ ${lucro.toFixed(2)} 💰`, 'success')
}

// ===================== RENDER =====================
function getAvailableProducts() { return STATE.products.filter(p => !p.vendido) }

function renderProductFilters() {
  const products = getAvailableProducts()
  const rooms = [...new Set(products.map(p => p.comodo))]
  const types = [...new Set(products.map(p => p.tipo))]
    ;['filter-room', 'filter-catalog-room'].forEach(id => {
      const el = document.getElementById(id); if (!el) return
      const cur = el.value
      el.innerHTML = '<option value="">Todos os cômodos</option>' + rooms.map(r => `<option ${r === cur ? 'selected' : ''}>${r}</option>`).join('')
    });
  ['filter-type', 'filter-catalog-type'].forEach(id => {
    const el = document.getElementById(id); if (!el) return
    const cur = el.value
    el.innerHTML = '<option value="">Todos os tipos</option>' + types.map(t => `<option ${t === cur ? 'selected' : ''}>${t}</option>`).join('')
  })
}

function getFilteredProducts(searchId, roomId, typeId) {
  const q = (document.getElementById(searchId)?.value || '').toLowerCase()
  const room = document.getElementById(roomId)?.value || ''
  const type = document.getElementById(typeId)?.value || ''
  return getAvailableProducts().filter(p => {
    const matchQ = !q || p.nome.toLowerCase().includes(q) || (p.descricao || '').toLowerCase().includes(q)
    return matchQ && (!room || p.comodo === room) && (!type || p.tipo === type)
  })
}

function productCard(p, isAdmin) {
  const img = p.fotos && p.fotos[0] ? `<img src="${p.fotos[0]}" alt="${p.nome}">` : `<span>🛋️</span>`
  const adminBtns = isAdmin ? `
    <button class="btn btn-ghost btn-sm" onclick="viewProductDetail('${p.id}')">👁️ Ver</button>
    <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">✏️ Editar</button>
    <button class="btn btn-success btn-sm" onclick="openSellModal('${p.id}')">✅ Vendido</button>
    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">🗑️</button>
  ` : `
    <button class="btn btn-accent btn-sm" onclick="openPropose('${p.id}')">📋 Proposta / Vender</button>
  `
  return `
    <div class="product-card">
      <div class="product-img">${img}</div>
      <div class="product-body">
        <div class="product-badges">
          <span class="badge badge-room">${p.comodo}</span>
          <span class="badge badge-type">${p.tipo}</span>
          <span class="badge badge-available">Disponível</span>
        </div>
        <div class="product-name">${p.nome}</div>
        <div class="product-price">R$ ${parseFloat(p.preco).toFixed(2)}</div>
        ${p.descricao ? `<div class="product-desc">${p.descricao.substring(0, 80)}${p.descricao.length > 80 ? '...' : ''}</div>` : ''}
        ${isAdmin ? `<div style="font-size:12px;color:var(--text2);margin-top:6px;">Custo: R$ ${parseFloat(p.custo).toFixed(2)} | Lucro prev.: <b style="color:var(--success)">R$ ${(p.preco - p.custo).toFixed(2)}</b></div>` : ''}
        <div class="product-actions">${adminBtns}</div>
      </div>
    </div>`
}

function renderProducts() {
  renderProductFilters()
  const list = getFilteredProducts('search-products', 'filter-room', 'filter-type')
  const el = document.getElementById('products-list')
  el.innerHTML = list.length ? list.map(p => productCard(p, true)).join('') :
    '<div class="empty-state"><div class="icon">📦</div><p>Nenhum produto encontrado</p></div>'
}

function renderDashRecent() {
  const el = document.getElementById('dash-recent')
  const list = getAvailableProducts().slice(0, 6)
  el.innerHTML = list.length ? list.map(p => productCard(p, true)).join('') :
    '<div class="empty-state"><div class="icon">📦</div><p>Nenhum produto cadastrado ainda</p></div>'
}

function renderCatalogFilters() {
  renderProductFilters()
  const s = STATE.settings
  const info = document.getElementById('catalog-contact-info')
  if (info) {
    info.innerHTML = [
      s.phone ? `<div class="catalog-contact-item">📞 ${s.phone}</div>` : '',
      s.email ? `<div class="catalog-contact-item">✉️ ${s.email}</div>` : '',
    ].join('')
  }
}

function renderCatalog() {
  const list = getFilteredProducts('search-catalog', 'filter-catalog-room', 'filter-catalog-type')
  const el = document.getElementById('catalog-list')
  el.innerHTML = list.length ? list.map(p => productCard(p, false)).join('') :
    '<div class="empty-state"><div class="icon">🛋️</div><p>Nenhum produto disponível no momento</p></div>'
}

// ===================== SOLD =====================
function renderSold() {
  const tbody = document.getElementById('sold-list')
  if (!STATE.soldProducts.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text2);padding:32px;">Nenhuma venda registrada ainda</td></tr>'
    return
  }
  tbody.innerHTML = STATE.soldProducts.map(p => `
    <tr>
      <td><b>${p.nome_produto}</b></td>
      <td>${p.comodo || ''} / ${p.tipo || ''}</td>
      <td>R$ ${parseFloat(p.custo).toFixed(2)}</td>
      <td>R$ ${parseFloat(p.preco_venda).toFixed(2)}</td>
      <td class="${p.lucro >= 0 ? 'profit-positive' : 'profit-negative'}">R$ ${parseFloat(p.lucro).toFixed(2)}</td>
      <td>${new Date(p.vendido_em).toLocaleDateString('pt-BR')}</td>
    </tr>`).join('')
}

// ===================== STATS =====================
function updateStats() {
  const avail = getAvailableProducts()
  const totalProfit = STATE.soldProducts.reduce((a, p) => a + (p.lucro || 0), 0)
  const invested = avail.reduce((a, p) => a + p.custo, 0)
  document.getElementById('stat-available').textContent = avail.length
  document.getElementById('stat-profit').textContent = 'R$ ' + totalProfit.toFixed(2)
  document.getElementById('stat-sold-count').textContent = STATE.soldProducts.length
  document.getElementById('stat-invested').textContent = 'R$ ' + invested.toFixed(2)
}

// ===================== PROPOSALS =====================
function openPropose(productId) {
  STATE.currentProposalProductId = productId
  STATE.propSellImg = null
  const p = STATE.products.find(x => x.id === productId)
    ;['prop-name', 'prop-phone', 'prop-email', 'prop-msg'].forEach(id => document.getElementById(id).value = '')
  document.getElementById('prop-type').value = 'compra'
  document.getElementById('prop-sell-desc').value = ''
  document.getElementById('prop-sell-value').value = ''
  document.getElementById('prop-sell-img-preview').innerHTML = ''
  toggleSellExtra()
  const info = document.getElementById('propose-product-info')
  if (p) {
    const img = p.fotos && p.fotos[0] ? `<img src="${p.fotos[0]}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;float:left;margin-right:12px;">` : '🛋️'
    info.innerHTML = `${img}<b>${p.nome}</b><br><span style="color:var(--text2)">${p.comodo} • ${p.tipo}</span><br><b style="color:var(--accent)">R$ ${parseFloat(p.preco).toFixed(2)}</b>`
  }
  openModal('modal-propose')
}

function toggleSellExtra() {
  const v = document.getElementById('prop-type').value
  document.getElementById('sell-extra').style.display = v === 'venda' ? 'block' : 'none'
}

async function submitProposal() {
  const nome = document.getElementById('prop-name').value.trim()
  const telefone = document.getElementById('prop-phone').value.trim()
  const email = document.getElementById('prop-email').value.trim()
  const tipo = document.getElementById('prop-type').value
  const mensagem = document.getElementById('prop-msg').value.trim()

  if (!nome || !telefone) { toast('Nome e telefone são obrigatórios!', 'error'); return }

  const { error } = await _supabase.from('propostas').insert({
    produto_id: STATE.currentProposalProductId,
    nome, telefone, email, tipo, mensagem,
    desc_venda: tipo === 'venda' ? document.getElementById('prop-sell-desc').value : null,
    valor_venda: tipo === 'venda' ? parseFloat(document.getElementById('prop-sell-value').value) || null : null,
    foto_venda: tipo === 'venda' ? STATE.propSellImg : null,
  })

  if (error) { toast('Erro ao enviar proposta', 'error'); return }
  closeModal('modal-propose')
  toast('Proposta enviada! Entraremos em contato. 📨', 'success')
}

// ===================== DETAIL =====================
async function viewProductDetail(id) {
  const p = STATE.products.find(x => x.id === id)
  if (!p) return

  const proposals = await carregarPropostas(id)
  const imgs = (p.fotos || []).map(src => `<img src="${src}" style="width:100px;height:80px;object-fit:cover;border-radius:8px;">`).join('')
  const propsHtml = proposals.length ? proposals.map(pr => `
    <div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">
      <b>${pr.nome}</b> — ${pr.tipo === 'compra' ? '🛒 Compra' : '📦 Venda'}<br>
      <span style="font-size:13px;color:var(--text2)">📞 ${pr.telefone}${pr.email ? ' | ✉️ ' + pr.email : ''}</span><br>
      ${pr.mensagem ? `<span style="font-size:13px;">${pr.mensagem}</span><br>` : ''}
      ${pr.tipo === 'venda' && pr.desc_venda ? `<div style="margin-top:6px;font-size:13px;background:var(--bg);padding:8px;border-radius:6px;"><b>Produto p/ vender:</b> ${pr.desc_venda}${pr.valor_venda ? ' — R$ ' + pr.valor_venda : ''}</div>` : ''}
      ${pr.foto_venda ? `<img src="${pr.foto_venda}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin-top:6px;">` : ''}
      <div style="font-size:11px;color:var(--text2);margin-top:4px;">${new Date(pr.criado_em).toLocaleDateString('pt-BR')}</div>
    </div>
  `).join('') : '<p style="color:var(--text2);font-size:13px;">Nenhuma proposta recebida</p>'

  document.getElementById('modal-detail-content').innerHTML = `
    <h2 style="font-family:'Playfair Display',serif;color:var(--wood-dark);">${p.nome}</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;">${imgs}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;">
      <div><b>Cômodo:</b> ${p.comodo}</div>
      <div><b>Tipo:</b> ${p.tipo}</div>
      <div><b>Custo:</b> R$ ${parseFloat(p.custo).toFixed(2)}</div>
      <div><b>Preço sugerido:</b> R$ ${parseFloat(p.preco).toFixed(2)}</div>
      <div><b>Lucro prev.:</b> <span style="color:var(--success);font-weight:700">R$ ${(p.preco - p.custo).toFixed(2)}</span></div>
      <div><b>Cadastrado:</b> ${new Date(p.criado_em).toLocaleDateString('pt-BR')}</div>
    </div>
    ${p.descricao ? `<div style="background:var(--bg);padding:12px;border-radius:8px;font-size:14px;color:var(--text2);margin-bottom:16px;">${p.descricao}</div>` : ''}
    <h3 style="font-family:'Playfair Display',serif;margin-bottom:10px;">📋 Propostas (${proposals.length})</h3>
    ${propsHtml}
  `
  openModal('modal-detail')
}

// ===================== SETTINGS =====================
function openSettingsModal() {
  document.getElementById('set-name').value = STATE.settings.name || ''
  document.getElementById('set-phone').value = STATE.settings.phone || ''
  document.getElementById('set-email').value = STATE.settings.email || ''
  document.getElementById('set-pass').value = ''
  openModal('modal-settings')
}

async function saveSettings() {
  STATE.settings.name = document.getElementById('set-name').value.trim() || 'Pereira & Alem'
  STATE.settings.phone = document.getElementById('set-phone').value.trim()
  STATE.settings.email = document.getElementById('set-email').value.trim()

  const newPass = document.getElementById('set-pass').value
  if (newPass) {
    const { error } = await _supabase.auth.updateUser({ password: newPass })
    if (error) { toast('Erro ao alterar senha', 'error'); return }
    toast('Senha alterada!', 'success')
  }

  closeModal('modal-settings')
  toast('Configurações salvas!', 'success')
}

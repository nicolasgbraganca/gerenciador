// ===================== SUPABASE =====================
const SUPABASE_URL = 'https://mwzkhjnzvfhcarnifgxa.supabase.co'
const SUPABASE_KEY = 'sb_publishable_4Lrj5afQdnT9v5tTCP942g_KEpJfU5D'
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// ===================== STATE =====================
let STATE = {
  products: [], proposals: [], sales: [], expenses: [],
  settings: { name: 'Pereira & Alem', phone: '', email: '' },
  tempImgs: [], propSellImg: null,
  editingProductId: null, currentProposalProductId: null,
}

// ===================== BOOT =====================
document.addEventListener('DOMContentLoaded', async () => {
  // Corrige altura no Safari iOS
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
  window.addEventListener('resize', () => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
  })

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
  else { carregarConfiguracoes(); carregarProdutos(false).then(renderCatalog) }
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
  STATE.sales = []
  STATE.expenses = []
  document.getElementById('app').style.display = 'none'
  document.getElementById('page-login').style.display = 'flex'
  document.getElementById('login-pass').value = ''
}

function showPublicCatalog() {
  document.getElementById('page-login').style.display = 'none'
  document.getElementById('app').style.display = 'flex'
  document.querySelector('.sidebar').style.display = 'none'
  document.querySelector('.main').style.marginLeft = '0'
  showPage('catalog')
}

function showLoginFromCatalog() {
  document.getElementById('app').style.display = 'none'
  document.getElementById('page-login').style.display = 'flex'
}

function entrarNoApp() {
  document.getElementById('page-login').style.display = 'none'
  document.getElementById('app').style.display = 'flex'
  document.querySelector('.sidebar').style.display = ''
  document.querySelector('.main').style.marginLeft = ''
  carregarConfiguracoes()
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

  if (name === 'catalog') carregarProdutos(false).then(() => { renderCatalogFilters(); renderCatalog() })
  if (name === 'dashboard') carregarProdutos(true).then(() => { updateStats(); renderDashRecent() })
  if (name === 'products') carregarProdutos(true).then(renderProducts)
  if (name === 'sales') carregarSales().then(renderSales)
  if (name === 'expenses') carregarExpenses().then(renderExpenses)
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
async function carregarProdutos(isAdmin = true) {
  const { data, error } = await _supabase
    .from('produtos')
    .select(isAdmin ? '*' : 'id,nome,preco,descricao,fotos,vendido,criado_em')
    .eq('vendido', false)
    .order('criado_em', { ascending: false })
  if (error) { toast('Erro ao carregar produtos', 'error'); return }
  STATE.products = data || []
}

async function carregarSales() {
  const { data, error } = await _supabase.from('vendas').select('*').order('vendido_em', { ascending: false })
  if (error) { toast('Não foi possível carregar o histórico de vendas', 'error'); return }
  STATE.sales = data || []
}

async function carregarExpenses() {
  const { data, error } = await _supabase.from('despesas').select('*').order('data', { ascending: false })
  if (error) { toast('Não foi possível carregar despesas. Confira se a migração do banco foi aplicada.', 'error'); return }
  STATE.expenses = data || []
}

async function carregarVendasMes() {
  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data, error } = await _supabase
    .from('vendas')
    .select('id')
    .gte('vendido_em', inicioMes)
    .lte('vendido_em', fimMes)
    .eq('anulada', false)

  if (error) { toast('Erro ao carregar vendas', 'error'); return 0 }
  return data?.length || 0
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

async function persistImages(images, folder) {
  const persisted = []
  for (const image of images) {
    if (!String(image).startsWith('data:image/')) { persisted.push(image); continue }
    const blob = await (await fetch(image)).blob()
    const ext = ({ 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif' })[blob.type]
    if (!ext) throw new Error('Formato de imagem não aceito')
    const path = `${folder}/${crypto.randomUUID()}.${ext}`
    const { error } = await _supabase.storage.from('imagens-loja').upload(path, blob, { contentType: blob.type, upsert: false })
    if (error) throw error
    persisted.push(_supabase.storage.from('imagens-loja').getPublicUrl(path).data.publicUrl)
  }
  return persisted
}

function renderImgPreview() {
  document.getElementById('img-preview-list').innerHTML =
    STATE.tempImgs.map((src, i) => `<div class="img-thumb-wrap"><img class="img-thumb" src="${safeImage(src)}" title="Foto ${i + 1}"><button type="button" onclick="removeProductImage(${i})" aria-label="Remover foto">×</button></div>`).join('')
}

function removeProductImage(index) { STATE.tempImgs.splice(index, 1); renderImgPreview() }

function handleProposeSellImg(e) {
  const f = e.target.files[0]
  if (!f) return
  const r = new FileReader()
  r.onload = ev => {
    STATE.propSellImg = ev.target.result
    document.getElementById('prop-sell-img-preview').innerHTML =
      `<img class="img-thumb" src="${safeImage(STATE.propSellImg)}" style="margin-top:8px;">`
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
  document.getElementById('img-preview-list').innerHTML = ''
  openModal('modal-product')
}

async function saveProduct() {
  const nome = document.getElementById('p-name').value.trim()
  const custo = parseFloat(document.getElementById('p-cost').value)
  const preco = parseFloat(document.getElementById('p-price').value)
  const descricao = document.getElementById('p-desc').value.trim()

  if (!nome || !Number.isFinite(custo) || !Number.isFinite(preco) || custo < 0 || preco <= 0) {
    toast('Preencha todos os campos obrigatórios (*)', 'error'); return
  }
  if (preco < custo && !confirm('O preço de venda está abaixo do custo. Deseja continuar?')) return
  if (STATE.tempImgs.length === 0 && !STATE.editingProductId) {
    toast('Adicione ao menos uma foto!', 'error'); return
  }

  const editId = document.getElementById('product-id').value
  let fotos
  try { fotos = await persistImages(STATE.tempImgs, 'produtos') }
  catch (error) { console.error(error); toast('Não foi possível enviar as fotos. Confira o bucket de imagens no Supabase.', 'error'); return }

  if (editId) {
    const atualizacao = { nome, custo, preco, descricao }
    if (STATE.tempImgs.length) atualizacao.fotos = fotos
    const { error } = await _supabase.from('produtos').update(atualizacao).eq('id', editId)
    if (error) { toast('Erro ao atualizar produto', 'error'); return }
    toast('Produto atualizado!', 'success')
  } else {
    const { error } = await _supabase.from('produtos').insert({
      nome, custo, preco, descricao, fotos, vendido: false
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
  console.log('Enviando para Sheets:', dados)
  try {
    await fetch('https://script.google.com/macros/s/AKfycbxTE2IDco73VGMtIqK3uZulW_KwLoy3B2nON82R6O9D3jYc7tN0hOFqPORDfwa_f-2duw/exec', {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(dados)
    })
  } catch (erro) {
    console.error('Erro ao enviar para Sheets:', erro)
  }
}

async function confirmSell() {
  console.log('confirmSell chamado!')
  const id = document.getElementById('sell-product-id').value
  const precoVenda = parseFloat(document.getElementById('sell-final-price').value)
  const p = STATE.products.find(x => x.id === id)
  if (!p) return

  if (!Number.isFinite(precoVenda) || precoVenda <= 0) { toast('Informe um preço final válido', 'error'); return }
  if (precoVenda < Number(p.custo) && !confirm('O preço final ficou abaixo do custo. Registrar mesmo assim?')) return

  const { data: venda, error } = await _supabase.rpc('registrar_venda', { p_produto_id: id, p_preco_venda: precoVenda })
  if (error) { toast('Não foi possível registrar a venda. Confira se a migração foi aplicada.', 'error'); return }
  const lucro = Number(venda?.lucro ?? (precoVenda - Number(p.custo)))

  closeModal('modal-sell')
  await carregarProdutos()
  renderProducts()
  renderDashRecent()
  updateStats()
  enviarParaSheets({
    produto: p.nome,
    custo: p.custo,
    precoVenda: precoVenda,
    lucro: lucro
  })
  toast(`Venda registrada! Lucro: R$ ${lucro.toFixed(2)} 💰`, 'success')
}

// ===================== RENDER =====================
function getAvailableProducts() { return STATE.products.filter(p => !p.vendido) }

function getFilteredProducts(searchId) {
  const q = (document.getElementById(searchId)?.value || '').toLowerCase()
  return getAvailableProducts().filter(p =>
    !q || p.nome.toLowerCase().includes(q) || (p.descricao || '').toLowerCase().includes(q)
  )
}

function productCard(p, isAdmin) {
  const img = p.fotos && p.fotos[0] ? `<img src="${safeImage(p.fotos[0])}" alt="${escapeHTML(p.nome)}">` : `<span>🛋️</span>`
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
          <span class="badge badge-available">Disponível</span>
        </div>
        <div class="product-name">${escapeHTML(p.nome)}</div>
        <div class="product-price">R$ ${parseFloat(p.preco).toFixed(2)}</div>
        ${p.descricao ? `<div class="product-desc">${escapeHTML(p.descricao.substring(0, 80))}${p.descricao.length > 80 ? '...' : ''}</div>` : ''}
        ${isAdmin ? `<div style="font-size:12px;color:var(--text2);margin-top:6px;">Custo: R$ ${parseFloat(p.custo).toFixed(2)} | Lucro prev.: <b style="color:var(--success)">R$ ${(p.preco - p.custo).toFixed(2)}</b></div>` : ''}
        <div class="product-actions">${adminBtns}</div>
      </div>
    </div>`
}

function renderProducts() {
  const list = getFilteredProducts('search-products')
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
  const s = STATE.settings
  const title = document.querySelector('.catalog-header h1')
  if (title) title.textContent = `🛋️ ${s.name || 'Pereira & Alem'}`
  const info = document.getElementById('catalog-contact-info')
  if (info) {
    info.innerHTML = [
      s.phone ? `<div class="catalog-contact-item">📞 ${escapeHTML(s.phone)}</div>` : '',
      s.email ? `<div class="catalog-contact-item">✉️ ${escapeHTML(s.email)}</div>` : '',
    ].join('')
  }
}

function renderCatalog() {
  const list = getFilteredProducts('search-catalog')
  const el = document.getElementById('catalog-list')
  el.innerHTML = list.length ? list.map(p => productCard(p, false)).join('') :
    '<div class="empty-state"><div class="icon">🛋️</div><p>Nenhum produto disponível no momento</p></div>'
}

// ===================== STATS =====================
async function updateStats() {
  const avail = getAvailableProducts()
  const invested = avail.reduce((a, p) => a + Number(p.custo || 0), 0)
  const totalVendidoMes = await carregarVendasMes()
  const [salesResult, expensesResult] = await Promise.all([
    _supabase.from('vendas').select('preco_venda,lucro').eq('anulada', false).gte('vendido_em', inicioDoMes()).
      lte('vendido_em', fimDoMes()),
    _supabase.from('despesas').select('valor').gte('data', dataInicioDoMes()).
      lte('data', dataFimDoMes())
  ])

  document.getElementById('stat-available').textContent = avail.length
  document.getElementById('stat-sold-count').textContent = totalVendidoMes
  document.getElementById('stat-invested').textContent = 'R$ ' + invested.toFixed(2)
  if (salesResult.error || expensesResult.error) { toast('Não foi possível carregar o resumo financeiro completo', 'error'); return }
  const sales = salesResult.data || [], expenses = expensesResult.data || []
  document.getElementById('stat-revenue').textContent = moeda(sales.reduce((n, x) => n + Number(x.preco_venda || 0), 0))
  document.getElementById('stat-profit').textContent = moeda(sales.reduce((n, x) => n + Number(x.lucro || 0), 0))
  document.getElementById('stat-expenses').textContent = moeda(expenses.reduce((n, x) => n + Number(x.valor || 0), 0))
}

function inicioDoMes() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString() }
function fimDoMes() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString() }
function dataLocal(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function dataInicioDoMes() { const d = new Date(); return dataLocal(new Date(d.getFullYear(), d.getMonth(), 1)) }
function dataFimDoMes() { const d = new Date(); return dataLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
function hojeLocal() { return dataLocal(new Date()) }
function moeda(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function escapeHTML(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])) }
function safeImage(src) { const s = String(src || ''); return /^(https:\/\/|data:image\/(png|jpeg|jpg|webp|gif);base64,)/i.test(s) ? escapeHTML(s) : '' }

function tableHTML(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${escapeHTML(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`
}

function renderSales() {
  const rows = STATE.sales.map(s => `<tr class="${s.anulada ? 'sale-cancelled' : ''}"><td>${escapeHTML(new Date(s.vendido_em).toLocaleDateString('pt-BR'))}</td><td>${escapeHTML(s.nome_produto)}${s.anulada ? ' (ANULADA)' : ''}</td><td>${moeda(s.custo)}</td><td>${moeda(s.preco_venda)}</td><td class="${Number(s.lucro) >= 0 ? 'profit-positive' : 'profit-negative'}">${moeda(s.lucro)}</td><td>${s.anulada ? '—' : `<button class="btn btn-danger btn-sm" onclick="annulSale('${escapeHTML(s.id)}')">Anular</button>`}</td></tr>`).join('')
  document.getElementById('sales-list').innerHTML = rows ? tableHTML(['Data','Produto','Custo','Venda','Lucro bruto','Ação'], rows) : '<div class="empty-state">Nenhuma venda registrada ainda.</div>'
}

async function annulSale(id) {
  if (!confirm('Anular esta venda? O produto voltará ao estoque e a venda ficará marcada no histórico.')) return
  const { error } = await _supabase.rpc('anular_venda', { p_venda_id: id })
  if (error) { toast('Não foi possível anular a venda. Confira se a migração foi aplicada.', 'error'); return }
  await carregarSales(); await carregarProdutos(true); renderSales(); renderProducts(); renderDashRecent(); await updateStats()
  toast('Venda anulada e produto devolvido ao estoque', 'success')
}

function renderExpenses() {
  const rows = STATE.expenses.map(e => `<tr><td>${escapeHTML(new Date(`${e.data}T00:00:00`).toLocaleDateString('pt-BR'))}</td><td>${escapeHTML(e.descricao)}</td><td>${moeda(e.valor)}</td></tr>`).join('')
  document.getElementById('expenses-list').innerHTML = rows ? tableHTML(['Data','Descrição','Valor'], rows) : '<div class="empty-state">Nenhuma despesa registrada ainda.</div>'
}

function openExpenseModal() {
  document.getElementById('expense-description').value = ''
  document.getElementById('expense-amount').value = ''
  document.getElementById('expense-date').value = hojeLocal()
  openModal('modal-expense')
}

async function saveExpense() {
  const descricao = document.getElementById('expense-description').value.trim()
  const valor = Number(document.getElementById('expense-amount').value)
  const data = document.getElementById('expense-date').value || hojeLocal()
  if (!descricao || !Number.isFinite(valor) || valor <= 0) { toast('Informe descrição e valor válido', 'error'); return }
  const { error } = await _supabase.from('despesas').insert({ descricao, valor, data })
  if (error) { toast('Não foi possível salvar. Confira se a migração do banco foi aplicada.', 'error'); return }
  closeModal('modal-expense')
  await carregarExpenses(); renderExpenses(); await updateStats()
  toast('Despesa registrada', 'success')
}

function exportCsv(kind) {
  const rows = kind === 'sales' ? STATE.sales.map(s => [s.vendido_em, s.nome_produto, s.custo, s.preco_venda, s.lucro, s.anulada ? 'ANULADA' : 'Ativa']) : STATE.expenses.map(e => [e.data, e.descricao, e.valor])
  const headers = kind === 'sales' ? ['Data','Produto','Custo','Venda','Lucro','Status'] : ['Data','Descrição','Valor']
  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `${kind}-${new Date().toISOString().slice(0,10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
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
    const img = p.fotos && p.fotos[0] ? `<img src="${safeImage(p.fotos[0])}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;float:left;margin-right:12px;">` : '🛋️'
    info.innerHTML = `${img}<b>${escapeHTML(p.nome)}</b><br><b style="color:var(--accent)">R$ ${parseFloat(p.preco).toFixed(2)}</b>`
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

  let fotoVenda = null
  try { if (tipo === 'venda' && STATE.propSellImg) [fotoVenda] = await persistImages([STATE.propSellImg], 'propostas') }
  catch (uploadError) { console.error(uploadError); toast('Não foi possível enviar a foto', 'error'); return }
  const { error } = await _supabase.from('propostas').insert({
    produto_id: STATE.currentProposalProductId,
    nome, telefone, email, tipo, mensagem,
    desc_venda: tipo === 'venda' ? document.getElementById('prop-sell-desc').value : null,
    valor_venda: tipo === 'venda' ? parseFloat(document.getElementById('prop-sell-value').value) || null : null,
    foto_venda: fotoVenda,
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
  const imgs = (p.fotos || []).map(src => `<img src="${safeImage(src)}" style="width:100px;height:80px;object-fit:cover;border-radius:8px;">`).join('')
  const propsHtml = proposals.length ? proposals.map(pr => `
    <div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">
      <b>${escapeHTML(pr.nome)}</b> — ${pr.tipo === 'compra' ? '🛒 Compra' : '📦 Venda'}<br>
      <span style="font-size:13px;color:var(--text2)">📞 ${escapeHTML(pr.telefone)}${pr.email ? ' | ✉️ ' + escapeHTML(pr.email) : ''}</span><br>
      ${pr.mensagem ? `<span style="font-size:13px;">${escapeHTML(pr.mensagem)}</span><br>` : ''}
      ${pr.tipo === 'venda' && pr.desc_venda ? `<div style="margin-top:6px;font-size:13px;background:var(--bg);padding:8px;border-radius:6px;"><b>Produto p/ vender:</b> ${escapeHTML(pr.desc_venda)}${pr.valor_venda ? ' — R$ ' + escapeHTML(pr.valor_venda) : ''}</div>` : ''}
      ${pr.foto_venda ? `<img src="${safeImage(pr.foto_venda)}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin-top:6px;">` : ''}
      <div style="font-size:11px;color:var(--text2);margin-top:4px;">${new Date(pr.criado_em).toLocaleDateString('pt-BR')}</div>
    </div>
  `).join('') : '<p style="color:var(--text2);font-size:13px;">Nenhuma proposta recebida</p>'

  document.getElementById('modal-detail-content').innerHTML = `
    <h2 style="font-family:'Playfair Display',serif;color:var(--wood-dark);">${escapeHTML(p.nome)}</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;">${imgs}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;">
      <div><b>Custo:</b> R$ ${parseFloat(p.custo).toFixed(2)}</div>
      <div><b>Preço sugerido:</b> R$ ${parseFloat(p.preco).toFixed(2)}</div>
      <div><b>Lucro prev.:</b> <span style="color:var(--success);font-weight:700">R$ ${(p.preco - p.custo).toFixed(2)}</span></div>
      <div><b>Cadastrado:</b> ${new Date(p.criado_em).toLocaleDateString('pt-BR')}</div>
    </div>
    ${p.descricao ? `<div style="background:var(--bg);padding:12px;border-radius:8px;font-size:14px;color:var(--text2);margin-bottom:16px;">${escapeHTML(p.descricao)}</div>` : ''}
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
  const settings = {
    id: 1,
    name: document.getElementById('set-name').value.trim() || 'Pereira & Alem',
    phone: document.getElementById('set-phone').value.trim(),
    email: document.getElementById('set-email').value.trim()
  }

  const newPass = document.getElementById('set-pass').value
  if (newPass) {
    const { error } = await _supabase.auth.updateUser({ password: newPass })
    if (error) { toast('Erro ao alterar senha', 'error'); return }
    toast('Senha alterada!', 'success')
  }

  const { error: settingsError } = await _supabase.from('configuracoes_loja').upsert(settings)
  if (settingsError) { toast('Não foi possível salvar configurações. Confira se a migração foi aplicada.', 'error'); return }
  STATE.settings = settings
  renderCatalogFilters()

  closeModal('modal-settings')
  toast('Configurações salvas!', 'success')
}

async function carregarConfiguracoes() {
  const { data, error } = await _supabase.from('configuracoes_loja').select('name,phone,email').eq('id', 1).maybeSingle()
  if (error) { console.warn('Configurações da loja não carregadas:', error.message); return }
  if (data) STATE.settings = { ...STATE.settings, ...data }
  renderCatalogFilters()
}

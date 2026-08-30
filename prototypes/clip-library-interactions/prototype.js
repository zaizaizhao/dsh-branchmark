// PROTOTYPE — three BranchMark library interaction variants, switchable via ?variant=.

const icons = {
  archive: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M3 5h18V3H3zM9 10h6"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-9"/></svg>',
  quote: '<svg viewBox="0 0 24 24"><path d="M5 7h10a4 4 0 0 1 4 4v6M5 7l4-4M5 7l4 4"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="M12 3c.6 4.1 2.9 6.4 7 7-4.1.6-6.4 2.9-7 7-.6-4.1-2.9-6.4-7-7 4.1-.6 6.4-2.9 7-7Z"/><path d="M19 16c.2 1.7 1.1 2.6 2.8 2.8-1.7.2-2.6 1.1-2.8 2.8-.2-1.7-1.1-2.6-2.8-2.8 1.7-.2 2.6-1.1 2.8-2.8Z"/></svg>',
  branch: '<svg viewBox="0 0 24 24"><path d="M5 4v10a4 4 0 0 0 4 4h10M5 8h5a4 4 0 0 0 4-4M14 4l3 3M14 4l3-3M16 18l3 3M16 18l3-3"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="m8 4 8 8M14 3l7 7-4 1-4 4-1 4-7-7 4-1 4-4 1-4ZM7 17l-4 4"/></svg>',
  expand: '<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  drag: '<svg viewBox="0 0 24 24"><circle cx="8" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="18" r="1" fill="currentColor" stroke="none"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-7 7L3 12Z"/><circle cx="8" cy="8" r="1.5"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
}

const longText = `模型的标称上下文窗口只是上限，并不等于当前这一轮请求中仍然可以使用的精确额度。实际可用空间还会受到系统提示、工具定义、历史消息、工具结果、压缩策略和运行时截断的共同影响。\n\n因此，在继续一个复杂项目之前，更可靠的做法是把关键结论保存为可追溯的枝签，并在需要时显式选择要带入新会话的上下文，而不是依赖整段历史始终原样保留。\n\n这条超长枝签用于验证卡片固定高度、卡内展开以及居中沉浸查看三种交互。`

let clips = [
  { id: 1, time: '08/29 19:32', text: longText, source: '用户问候<|eos|> (1) · 第 4 轮', tag: '#啊啊啊', derived: 2, pinned: true },
  { id: 2, time: '08/29 19:02', text: 'Hello. How can I help you today?', source: 'User Starts Conversation with Hello · 第 1 轮', tag: '#啊啊啊', derived: 0, pinned: false },
  { id: 3, time: '08/29 19:00', text: '能调工具；标称上下文大约 500K token，当前会话没有暴露精确剩余额度。', source: '用户问候<|eos|> · 第 3 轮', tag: '', derived: 2, pinned: false },
  { id: 4, time: '08/29 18:57', text: '同一条枝签可以先留在本会话，确认有跨会话价值后再显式提升到项目。', source: '用户问候<|eos|> · 第 2 轮', tag: '#工作流', derived: 0, pinned: false },
]
let selected = new Set([1, 2, 3])
let inlineExpanded = new Set()
let draggedId = null
let currentFocusId = null
let commandOpen = false
let moreOpen = false
let toastTimer

const root = document.querySelector('#root')
const focusBackdrop = document.querySelector('#focus-backdrop')
const focusText = document.querySelector('#focus-text')
const focusTitle = document.querySelector('#focus-title')
const toast = document.querySelector('#toast')
const composerDemo = document.querySelector('#composer-demo')
const composerChip = document.querySelector('#composer-chip')

function variant() {
  const value = new URLSearchParams(location.search).get('variant')?.toUpperCase()
  return ['A', 'B', 'C'].includes(value) ? value : 'A'
}

const variantNames = {
  A: '直接操作栏（推荐）',
  B: '命令胶囊（窄屏优先）',
  C: '上下文托盘（强调顺序）',
}

function notify(message) {
  clearTimeout(toastTimer)
  toast.textContent = message
  toast.classList.add('show')
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800)
}

function sortedClips() {
  return [...clips].sort((a, b) => Number(b.pinned) - Number(a.pinned))
}

function selectedClips() {
  const ids = [...selected]
  return ids.map(id => clips.find(clip => clip.id === id)).filter(Boolean)
}

function actionButton(icon, label, action, kind = '') {
  return `<button class="action ${kind}" data-action="${action}" title="${label}" aria-label="${label}">${icons[icon]}<span class="action-label">${label}</span></button>`
}

function card(clip, layout) {
  const isSelected = selected.has(clip.id)
  const expanded = inlineExpanded.has(clip.id)
  const derived = clip.derived > 0 ? `<div class="derived">衍生会话 ${clip.derived} · <strong>点击查看关联分支</strong></div>` : '<div class="empty-note">没有衍生会话</div>'
  return `<article class="clip-card ${isSelected ? 'selected' : ''} ${expanded ? 'inline-expanded' : ''}" data-id="${clip.id}" draggable="true">
    <div class="card-top">
      <button class="drag-handle" title="拖动排序" aria-label="拖动排序">${icons.drag}</button>
      <span class="dot"></span><span class="meta">${clip.pinned ? '已置顶' : '项目枝签'} · ${clip.time}</span>
      <button class="pin ${clip.pinned ? 'active' : ''}" data-pin="${clip.id}" title="${clip.pinned ? '取消置顶' : '置顶'}">${icons.pin}<span>${clip.pinned ? '置顶' : ''}</span></button>
      <button class="check ${isSelected ? 'checked' : ''}" data-select="${clip.id}" aria-label="${isSelected ? '取消选择' : '选择'}">${icons.check}</button>
    </div>
    <div class="excerpt-wrap"><p class="excerpt">${clip.text.replaceAll('\n', '<br>')}</p></div>
    <div class="source">${clip.tag ? `<span class="tag">${clip.tag}</span> · ` : ''}${clip.source} · 可恢复上下文</div>
    ${layout === 'B' ? '' : derived}
    <footer class="card-actions">
      <button class="card-action" data-card-action="inline" data-id="${clip.id}" title="${expanded ? '收起正文' : '在卡片中展开'}">${icons.chevron}<span>${expanded ? '收起' : '展开'}</span></button>
      <button class="card-action" data-card-action="focus" data-id="${clip.id}" title="居中查看全文">${icons.expand}<span>聚焦</span></button>
      <button class="card-action" data-card-action="reference" data-id="${clip.id}" title="引用到输入框">${icons.quote}<span>引用</span></button>
      <button class="card-action danger" data-card-action="delete" data-id="${clip.id}" title="移入回收站">${icons.trash}<span>删除</span></button>
    </footer>
  </article>`
}

function cards(layout) {
  const items = sortedClips()
  const pinned = items.filter(clip => clip.pinned)
  const regular = items.filter(clip => !clip.pinned)
  return `${pinned.length ? `<div class="section-label">${icons.pin}<span>置顶</span><span class="line"></span></div><div class="grid">${pinned.map(clip => card(clip, layout)).join('')}</div>` : ''}
    <div class="section-label"><span>全部枝签</span><span class="line"></span><span>${regular.length}</span></div>
    <div class="grid">${regular.map(clip => card(clip, layout)).join('')}</div>`
}

function commonPage(layout, batch) {
  return `<div class="state-line">原型状态 · 已选 ${selected.size} · 置顶 ${clips.filter(clip => clip.pinned).length} · 库顺序 ${clips.map(clip => clip.id).join(' → ')}</div>
  <section class="app variant-${layout.toLowerCase()}">
    <header class="header"><div class="brand-icon">${icons.archive}</div><div class="heading"><strong>项目枝签</strong><span>介绍下什么是 dsh · 交互原型</span></div><div class="header-actions"><button class="icon-btn" title="最小化">${icons.chevron}</button><button class="icon-btn" title="关闭">${icons.close}</button></div></header>
    <nav class="tabs"><button class="tab">本会话</button><button class="tab active">项目</button><button class="tab">会话分支</button><button class="tab">Side Chat</button></nav>
    <div class="toolbar"><label class="search">${icons.search}<input placeholder="搜索正文、备注或标签"></label><button class="icon-btn" title="筛选置顶">${icons.pin}</button><button class="icon-btn" title="排序">${icons.drag}</button></div>
    <p class="hint">卡片保持固定高度；长正文可卡内展开，也可以居中沉浸查看。置顶优先于手动顺序。</p>
    <div class="tag-row"><button class="tag">#啊啊啊</button><button class="tag">#工作流</button><button class="tag">全部标签</button></div>
    <div class="content">${cards(layout)}</div>
  </section>${batch}${switcher()}`
}

function batchA() {
  return `<aside class="batch-bar" aria-label="批量操作">
    <div class="batch-summary"><span class="count">${selected.size}</span><span class="summary-copy"><strong>已选择</strong><span>按选择顺序执行</span></span></div>
    <span class="bar-spacer"></span>
    ${actionButton('quote', '引用到输入框', 'reference', 'primary')}
    ${actionButton('sparkle', 'Side Chat', 'side')}
    ${actionButton('branch', '新会话', 'session', 'batch-secondary')}
    <button class="action icon-only" data-action="more" title="更多批量操作" aria-label="更多批量操作">${icons.more}</button>
    <div class="action-menu ${moreOpen ? 'open' : ''}">
      <button class="menu-item" data-action="pin">${icons.pin}置顶所选</button>
      <button class="menu-item" data-action="unpin">${icons.pin}取消置顶</button>
      <button class="menu-item" data-action="tag">${icons.tag}追加标签</button>
      <button class="menu-item danger" data-action="delete">${icons.trash}移入回收站</button>
    </div>
  </aside>`
}

function batchB() {
  return `<div class="command-capsule"><span class="count">${selected.size}</span><button class="capsule-button" data-action="commands">处理 ${selected.size} 条${icons.more}</button></div>
  <section class="command-sheet ${commandOpen ? 'open' : ''}" aria-label="批量命令">
    <header><strong>选择一个明确动作</strong><button class="icon-btn" data-action="commands">${icons.close}</button></header>
    <div class="command-grid">
      <button class="command" data-action="reference">${icons.quote}<span>引用到输入框</span></button>
      <button class="command" data-action="side">${icons.sparkle}<span>Side Chat</span></button>
      <button class="command" data-action="session">${icons.branch}<span>新会话</span></button>
      <button class="command" data-action="pin">${icons.pin}<span>置顶</span></button>
      <button class="command" data-action="tag">${icons.tag}<span>加标签</span></button>
      <button class="command" data-action="delete">${icons.trash}<span>回收站</span></button>
    </div>
  </section>`
}

function batchC() {
  const items = selectedClips()
  return `<aside class="tray" aria-label="所选上下文托盘">
    <div class="tray-title"><span class="count">${items.length}</span><div><strong>上下文托盘</strong><span>拖拽决定发送顺序</span></div></div>
    <div class="tray-list">${items.map((clip, index) => `<div class="tray-item" draggable="true" data-tray-id="${clip.id}"><span class="tray-order">${index + 1}</span><span class="tray-text">${clip.text}</span><button class="tray-remove" data-tray-remove="${clip.id}">×</button></div>`).join('')}</div>
    <div class="tray-actions">${actionButton('sparkle', 'Side Chat', 'side')}${actionButton('quote', '引用到输入框', 'reference', 'primary')}</div>
  </aside>`
}

function switcher() {
  const current = variant()
  return `<nav class="prototype-switcher" aria-label="原型方案切换"><button data-variant-step="-1" aria-label="上一方案">←</button><span class="variant-label">${current} — ${variantNames[current]}</span><button data-variant-step="1" aria-label="下一方案">→</button></nav>`
}

function render() {
  const current = variant()
  if (current === 'A') root.innerHTML = commonPage('A', batchA())
  if (current === 'B') root.innerHTML = commonPage('B', batchB())
  if (current === 'C') root.innerHTML = commonPage('C', batchC())
  bind()
}

function bind() {
  document.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => {
    const id = Number(button.dataset.select)
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
    render()
  }))
  document.querySelectorAll('[data-pin]').forEach(button => button.addEventListener('click', () => {
    const clip = clips.find(item => item.id === Number(button.dataset.pin))
    clip.pinned = !clip.pinned
    notify(clip.pinned ? '已置顶；置顶区内仍可拖拽排序' : '已取消置顶')
    render()
  }))
  document.querySelectorAll('[data-card-action]').forEach(button => button.addEventListener('click', () => cardAction(button.dataset.cardAction, Number(button.dataset.id))))
  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => batchAction(button.dataset.action)))
  document.querySelectorAll('[data-variant-step]').forEach(button => button.addEventListener('click', () => stepVariant(Number(button.dataset.variantStep))))
  document.querySelectorAll('.clip-card').forEach(cardElement => {
    cardElement.addEventListener('dragstart', () => { draggedId = Number(cardElement.dataset.id); cardElement.classList.add('dragging') })
    cardElement.addEventListener('dragend', () => { draggedId = null; cardElement.classList.remove('dragging') })
    cardElement.addEventListener('dragover', event => { event.preventDefault(); cardElement.classList.add('drag-target') })
    cardElement.addEventListener('dragleave', () => cardElement.classList.remove('drag-target'))
    cardElement.addEventListener('drop', event => { event.preventDefault(); cardElement.classList.remove('drag-target'); reorderLibrary(draggedId, Number(cardElement.dataset.id)) })
  })
  document.querySelectorAll('[data-tray-remove]').forEach(button => button.addEventListener('click', () => { selected.delete(Number(button.dataset.trayRemove)); render() }))
  document.querySelectorAll('.tray-item').forEach(item => {
    item.addEventListener('dragstart', () => { draggedId = Number(item.dataset.trayId); item.classList.add('dragging') })
    item.addEventListener('dragend', () => { draggedId = null; item.classList.remove('dragging') })
    item.addEventListener('dragover', event => event.preventDefault())
    item.addEventListener('drop', event => { event.preventDefault(); reorderSelection(draggedId, Number(item.dataset.trayId)) })
  })
}

function cardAction(action, id) {
  if (action === 'inline') {
    if (inlineExpanded.has(id)) inlineExpanded.delete(id)
    else inlineExpanded.add(id)
    render()
  }
  if (action === 'focus') openFocus(id)
  if (action === 'reference') reference([id])
  if (action === 'delete') {
    clips = clips.filter(clip => clip.id !== id)
    selected.delete(id)
    notify('已移入回收站；原型刷新后恢复')
    render()
  }
}

function batchAction(action) {
  if (action === 'more') { moreOpen = !moreOpen; render(); return }
  if (action === 'commands') { commandOpen = !commandOpen; render(); return }
  if (selected.size === 0 && !['more', 'commands'].includes(action)) { notify('请先选择至少一条枝签'); return }
  if (action === 'reference') reference([...selected])
  if (action === 'side') notify(`已用 ${selected.size} 条枝签打开临时 Side Chat`)
  if (action === 'session') notify(`进入新会话创建页，已携带 ${selected.size} 条枝签`)
  if (action === 'pin' || action === 'unpin') {
    const value = action === 'pin'
    clips.forEach(clip => { if (selected.has(clip.id)) clip.pinned = value })
    moreOpen = false
    commandOpen = false
    notify(value ? '已将所选枝签置顶' : '已取消所选枝签置顶')
    render()
  }
  if (action === 'tag') notify('这里打开轻量标签输入框，不让批量栏继续横向膨胀')
  if (action === 'delete') {
    clips = clips.filter(clip => !selected.has(clip.id))
    selected.clear()
    moreOpen = false
    commandOpen = false
    notify('所选枝签已移入回收站')
    render()
  }
}

function reference(ids) {
  composerChip.textContent = `引用枝签 ${ids.length}`
  composerDemo.classList.add('show')
  notify(`已加入主输入框：${ids.length} 条结构化引用，不自动发送`)
  setTimeout(() => composerDemo.classList.remove('show'), 2600)
}

function reorderLibrary(from, to) {
  if (from === null || from === to) return
  const source = clips.find(clip => clip.id === from)
  const target = clips.find(clip => clip.id === to)
  if (!source || !target) return
  if (source.pinned !== target.pinned) {
    notify('置顶区与普通区不能直接跨区拖动；请先切换置顶状态')
    return
  }
  const fromIndex = clips.findIndex(clip => clip.id === from)
  const toIndex = clips.findIndex(clip => clip.id === to)
  const [moved] = clips.splice(fromIndex, 1)
  clips.splice(toIndex, 0, moved)
  notify('已调整库内顺序；生产实现应保存 sortIndex')
  render()
}

function reorderSelection(from, to) {
  if (from === null || from === to) return
  const ids = [...selected]
  const fromIndex = ids.indexOf(from)
  const toIndex = ids.indexOf(to)
  if (fromIndex < 0 || toIndex < 0) return
  const [moved] = ids.splice(fromIndex, 1)
  ids.splice(toIndex, 0, moved)
  selected = new Set(ids)
  notify('已调整本次上下文顺序，不改变枝签库永久顺序')
  render()
}

function openFocus(id) {
  const clip = clips.find(item => item.id === id)
  if (!clip) return
  currentFocusId = id
  focusTitle.textContent = `枝签全文 · ${clip.source}`
  focusText.textContent = clip.text
  focusBackdrop.classList.add('open')
  focusBackdrop.setAttribute('aria-hidden', 'false')
}

function closeFocus() {
  currentFocusId = null
  focusBackdrop.classList.remove('open')
  focusBackdrop.setAttribute('aria-hidden', 'true')
}

function stepVariant(delta) {
  const keys = ['A', 'B', 'C']
  const index = keys.indexOf(variant())
  const next = keys[(index + delta + keys.length) % keys.length]
  const url = new URL(location.href)
  url.searchParams.set('variant', next)
  history.replaceState({}, '', url)
  commandOpen = false
  moreOpen = false
  render()
}

document.querySelector('#focus-close').addEventListener('click', closeFocus)
document.querySelector('#focus-copy').addEventListener('click', () => notify('已复制全文（原型演示）'))
document.querySelector('#focus-reference').addEventListener('click', () => { if (currentFocusId !== null) reference([currentFocusId]); closeFocus() })
focusBackdrop.addEventListener('click', event => { if (event.target === focusBackdrop) closeFocus() })
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { closeFocus(); commandOpen = false; moreOpen = false; render() }
  const editable = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable
  if (!editable && event.key === 'ArrowLeft') stepVariant(-1)
  if (!editable && event.key === 'ArrowRight') stepVariant(1)
})

render()

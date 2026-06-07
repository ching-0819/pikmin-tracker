// ===== DATA LAYER =====
const STORE = {
  mushroom: JSON.parse(localStorage.getItem('pikmin_mushroom') || '[]'),
  petal:    JSON.parse(localStorage.getItem('pikmin_petal')    || '[]'),
  trade:    JSON.parse(localStorage.getItem('pikmin_trade')    || '[]'),
};

function save(type) {
  localStorage.setItem('pikmin_' + type, JSON.stringify(STORE[type]));
}

// ===== MAP =====
let map, allMarkers = { mushroom: [], petal: [] };
let currentFilter = 'all';

function initMap() {
  map = L.map('map').setView([23.6978, 120.9605], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
}

function createMarkerIcon(type) {
  const color = type === 'mushroom' ? '#e76f51' : '#9b5de5';
  const emoji = type === 'mushroom' ? '🍄' : '💮';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:36px;height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      border:2px solid white;
    "><span style="transform:rotate(45deg);font-size:16px">${emoji}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
}

function refreshMap() {
  // Clear all markers
  allMarkers.mushroom.forEach(m => map.removeLayer(m));
  allMarkers.petal.forEach(m => map.removeLayer(m));
  allMarkers = { mushroom: [], petal: [] };

  const types = currentFilter === 'all' ? ['mushroom', 'petal'] : [currentFilter];

  types.forEach(type => {
    if (type === 'trade') return;
    STORE[type].forEach(entry => {
      if (!entry.lat || !entry.lng) return;
      const marker = L.marker([entry.lat, entry.lng], { icon: createMarkerIcon(type) });
      const photoHtml = entry.photos && entry.photos[0]
        ? `<img src="${entry.photos[0]}" style="width:100%;height:100px;object-fit:cover;border-radius:6px;margin-bottom:8px;">`
        : '';
      marker.bindPopup(`
        <div style="min-width:180px;font-family:'Noto Sans TC',sans-serif">
          ${photoHtml}
          <strong style="font-size:14px">${entry.name}</strong><br>
          <span style="font-size:12px;color:#6b7c6b">📅 ${entry.date || '日期未填'}</span><br>
          <span style="font-size:11px;color:#9ca3af">📍 ${parseFloat(entry.lat).toFixed(5)}, ${parseFloat(entry.lng).toFixed(5)}</span>
        </div>
      `);
      marker.addTo(map);
      allMarkers[type].push(marker);
    });
  });
}

// ===== RENDER CARDS =====
function renderCards(type) {
  const list = document.getElementById(type + '-list');
  const empty = document.getElementById(type + '-empty');
  const entries = STORE[type];

  if (entries.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  list.style.display = 'grid';
  empty.style.display = 'none';

  list.innerHTML = entries.map((e, i) => {
    const emoji = type === 'mushroom' ? '🍄' : type === 'petal' ? '💮' : '📬';
    const badgeClass = 'badge-' + type;
    const badgeLabel = type === 'mushroom' ? '打菇' : type === 'petal' ? '花點明信片' : '交換明信片';

    const photoBlock = e.photos && e.photos.length > 0
      ? `<div class="card-photo" onclick="openLightbox('${e.photos[0]}', event)"><img src="${e.photos[0]}" alt="${e.name}" loading="lazy"></div>`
      : `<div class="card-photo">${emoji}</div>`;

    const coordLine = (e.lat && e.lng)
      ? `<span>📍 ${parseFloat(e.lat).toFixed(4)}, ${parseFloat(e.lng).toFixed(4)}</span>` : '';
    const dateLine = e.date ? `<span>📅 ${e.date}</span>` : '';
    const petalLine = e.petalCount ? `<span>🌸 ${e.petalCount} 花瓣</span>` : '';
    const tradeLine = e.tradeFrom ? `<span>👤 ${e.tradeFrom}</span>` : '';

    const tags = e.tags ? e.tags.split(',').map(t => t.trim()).filter(Boolean)
      .map(t => `<span class="tag">${t}</span>`).join('') : '';

    const mapsLink = (e.lat && e.lng)
      ? `<button class="card-btn" onclick="openMaps(${e.lat},${e.lng},event)">🗺️ 導航</button>` : '';

    return `
      <div class="card">
        ${photoBlock}
        <div class="card-body">
          <span class="card-badge ${badgeClass}">${badgeLabel}</span>
          <div class="card-name">${e.name}</div>
          <div class="card-meta">
            ${dateLine}${coordLine}${petalLine}${tradeLine}
          </div>
          ${tags ? `<div class="card-tags">${tags}</div>` : ''}
          <div class="card-actions">
            ${mapsLink}
            <button class="card-btn" onclick="openModal('${type}', ${i}, event)">✏️ 編輯</button>
            <button class="card-btn delete" onclick="deleteEntry('${type}', ${i}, event)">🗑️ 刪除</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderAll() {
  renderCards('mushroom');
  renderCards('petal');
  renderCards('trade');
  refreshMap();
  updateStats();
}

function updateStats() {
  document.getElementById('count-mushroom').textContent = STORE.mushroom.length;
  document.getElementById('count-petal').textContent    = STORE.petal.length;
  document.getElementById('count-trade').textContent    = STORE.trade.length;
}

// ===== MODAL =====
let pendingPhotos = []; // array of base64 strings
let existingPhotos = [];

function openModal(type, editIndex, evt) {
  if (evt) evt.stopPropagation();

  const overlay = document.getElementById('modalOverlay');
  const form = document.getElementById('entryForm');
  form.reset();
  document.getElementById('photoPreviewRow').innerHTML = '';
  pendingPhotos = [];
  existingPhotos = [];

  document.getElementById('formType').value = type;
  document.getElementById('editId').value = editIndex !== undefined ? editIndex : '';

  const titles = { mushroom: '🍄 打菇紀錄', petal: '💮 花點明信片', trade: '📬 交換明信片' };
  document.getElementById('modalTitle').textContent =
    (editIndex !== undefined ? '編輯 ' : '新增 ') + titles[type];

  // Show/hide fields
  const hasCoord = type !== 'trade';
  document.getElementById('coordGroup').style.display  = hasCoord ? 'grid' : 'none';
  document.getElementById('coordHint').style.display   = hasCoord ? 'block' : 'none';
  document.getElementById('dateGroup').style.display   = type !== 'trade' ? 'block' : 'none';
  document.getElementById('petalCountGroup').style.display = type === 'petal' ? 'block' : 'none';
  document.getElementById('tradeFromGroup').style.display  = type === 'trade' ? 'block' : 'none';

  // Fill existing data
  if (editIndex !== undefined) {
    const e = STORE[type][editIndex];
    document.getElementById('fieldName').value = e.name || '';
    document.getElementById('fieldLat').value  = e.lat  || '';
    document.getElementById('fieldLng').value  = e.lng  || '';
    document.getElementById('fieldDate').value = e.date || '';
    document.getElementById('fieldTags').value = e.tags || '';
    if (type === 'petal') document.getElementById('fieldPetalCount').value = e.petalCount || '';
    if (type === 'trade') document.getElementById('fieldTradeFrom').value  = e.tradeFrom  || '';

    existingPhotos = e.photos ? [...e.photos] : [];
    existingPhotos.forEach((src, i) => {
      addPreviewThumb(src, i, true);
    });
  }

  overlay.classList.add('open');
}

function closeModal(evt) {
  if (evt && evt.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
}

// ===== PHOTOS =====
function previewPhotos(evt) {
  const files = Array.from(evt.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      pendingPhotos.push(e.target.result);
      const idx = existingPhotos.length + pendingPhotos.length - 1;
      addPreviewThumb(e.target.result, idx, false);
    };
    reader.readAsDataURL(file);
  });
  evt.target.value = '';
}

function addPreviewThumb(src, idx, isExisting) {
  const row = document.getElementById('photoPreviewRow');
  const wrap = document.createElement('div');
  wrap.className = 'preview-thumb';
  wrap.dataset.idx = idx;
  wrap.dataset.existing = isExisting;
  wrap.innerHTML = `
    <img src="${src}" alt="預覽">
    <button class="preview-remove" type="button" onclick="removePreview(this)">✕</button>
  `;
  row.appendChild(wrap);
}

function removePreview(btn) {
  const wrap = btn.closest('.preview-thumb');
  const isExisting = wrap.dataset.existing === 'true';
  const idx = parseInt(wrap.dataset.idx);
  if (isExisting) {
    existingPhotos.splice(idx, 1);
    // re-render all existing thumbs
    document.querySelectorAll('.preview-thumb[data-existing="true"]').forEach((el, i) => {
      el.dataset.idx = i;
    });
  } else {
    const pendingIdx = idx - existingPhotos.length;
    pendingPhotos.splice(pendingIdx, 1);
  }
  wrap.remove();
}

// ===== SAVE =====
function saveEntry(evt) {
  evt.preventDefault();
  const type = document.getElementById('formType').value;
  const editId = document.getElementById('editId').value;

  const allPhotos = [...existingPhotos, ...pendingPhotos];

  const entry = {
    name:  document.getElementById('fieldName').value.trim(),
    lat:   document.getElementById('fieldLat').value  || null,
    lng:   document.getElementById('fieldLng').value  || null,
    date:  document.getElementById('fieldDate').value || null,
    tags:  document.getElementById('fieldTags').value.trim(),
    photos: allPhotos,
  };

  if (type === 'petal') entry.petalCount = document.getElementById('fieldPetalCount').value || null;
  if (type === 'trade') {
    entry.tradeFrom = document.getElementById('fieldTradeFrom').value.trim();
    entry.lat = null; entry.lng = null;
  }

  if (editId !== '') {
    STORE[type][parseInt(editId)] = entry;
  } else {
    STORE[type].unshift(entry);
  }

  save(type);
  renderAll();
  document.getElementById('modalOverlay').classList.remove('open');
}

// ===== DELETE =====
function deleteEntry(type, idx, evt) {
  evt.stopPropagation();
  if (!confirm('確定要刪除這筆紀錄嗎？')) return;
  STORE[type].splice(idx, 1);
  save(type);
  renderAll();
}

// ===== NAVIGATION =====
function openMaps(lat, lng, evt) {
  evt.stopPropagation();
  window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
}

// ===== LIGHTBOX =====
function openLightbox(src, evt) {
  evt.stopPropagation();
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

// ===== EXPORT / IMPORT =====
function exportData() {
  const blob = new Blob([JSON.stringify(STORE, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pikmin-log-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  document.getElementById('importFile').click();
}

function handleImport(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!confirm('確定要匯入備份？這會覆蓋目前所有資料。')) return;
      ['mushroom', 'petal', 'trade'].forEach(t => {
        if (data[t]) { STORE[t] = data[t]; save(t); }
      });
      renderAll();
      alert('匯入成功！');
    } catch {
      alert('匯入失敗，請確認檔案格式正確。');
    }
  };
  reader.readAsText(file);
  evt.target.value = '';
}

// ===== FILTER =====
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    refreshMap();
  });
});

// ===== HAMBURGER =====
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobileMenu').classList.toggle('open');
});

document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    document.getElementById('mobileMenu').classList.remove('open');
  });
});

// ===== SMOOTH SCROLL NAV =====
document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ===== INIT =====
window.addEventListener('load', () => {
  initMap();
  renderAll();
});

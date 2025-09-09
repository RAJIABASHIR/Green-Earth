const API = {
  allPlants: 'https://openapi.programming-hero.com/api/plants',
  categories: 'https://openapi.programming-hero.com/api/categories',
  byCategory: (id) => `https://openapi.programming-hero.com/api/category/${id}`, 
  plantDetail: (id) => `https://openapi.programming-hero.com/api/plant/${id}`,   
};

const categoryList = document.getElementById('categoryList');
const plantsGrid = document.getElementById('plantsGrid');
const spinnerWrap = document.getElementById('spinner');
const cartList = document.getElementById('cartList');
const cartTotalEl = document.getElementById('cartTotal');

const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

const donationForm = document.getElementById('donationForm');
let activeCategoryId = 'all';
let activeBtnEl = null;
const cart = new Map(); 
const money = (n) => `$${Number(n || 0).toLocaleString()}`;
const showSpinner = (on) => spinnerWrap.classList.toggle('hidden', !on);
function setActiveBtn(btn) {
  if (activeBtnEl) activeBtnEl.classList.remove('bg-brand', 'text-white');
  btn.classList.add('bg-brand', 'text-white');
  activeBtnEl = btn;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const json = await res.json();
  return json.data ?? json.categories ?? json.plants ?? json;
}

function mapPlant(plant) {
  if (!plant) return null;
  const id = plant.id ?? plant._id ?? plant.plantId ?? plant.slug ?? plant.category_id ?? (plant.name ? String(plant.name).toLowerCase().replace(/\s+/g, '-') : Math.random().toString(36).slice(2, 9));
  const name = plant.name ?? plant.common_name ?? plant.plant_name ?? plant.title ?? 'Unknown Plant';
  const img = plant.image ?? plant.img ?? plant.thumbnail ?? (plant.images && plant.images[0]) ?? '/assets/default-plant.jpg';
  const desc = plant.short_description ?? plant.shortDescription ?? plant.description ?? plant.details ?? 'A lovely plant.';
  let category = plant.category ?? plant.type ?? plant.genus ?? 'Plant';
  if (typeof category === 'object') category = category.common ?? category.english ?? category.latin ?? 'Plant';
  const price = Number(plant.price ?? plant.cost ?? plant.price_usd ?? 500);
  return { id: String(id), name, img, desc, category, price };
}

async function loadCategories() {
  try {
    const raw = await fetchJSON(API.categories);
    const items = Array.isArray(raw) ? raw : (raw.data ?? raw.items ?? raw.categories ?? raw);

    categoryList.innerHTML = '';
    const allBtn = createCategoryBtn({ id: 'all', name: 'All Trees' });
    categoryList.appendChild(allBtn);
    setActiveBtn(allBtn);

    if (!items || items.length === 0) return;

    items.forEach(cat => {
      const id = cat.id ?? cat._id ?? cat.category_id ?? cat.slug ?? String(cat);
      let name = '';

      if (typeof cat.name === 'string') {
        name = cat.name;
      } else if (typeof cat.name === 'object' && cat.name !== null) {
        name = cat.name.english ?? cat.name.common ?? cat.name.latin ?? '';
      } else if (typeof cat.title === 'string') {
        name = cat.title;
      }

      if (!name) name = 'Plants';

      const btn = createCategoryBtn({ id, name });
      categoryList.appendChild(btn);
    });
  } catch (e) {
    console.error('Failed to load categories', e);
    categoryList.innerHTML = `<div class="text-sm text-red-600">Failed to load categories</div>`;
  }
}
function createCategoryBtn({ id, name }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-green-100 transition`;
  btn.textContent = name;

  btn.addEventListener('click', () => {
    activeCategoryId = id;
    setActiveBtn(btn);
    loadPlants();
  });

  return btn;
}
async function loadPlants() {
  try {
    showSpinner(true);
    plantsGrid.innerHTML = '';
    const url = activeCategoryId === 'all' ? API.allPlants : API.byCategory(activeCategoryId);
    const raw = await fetchJSON(url);
    const items = Array.isArray(raw) ? raw : (raw.data ?? raw.plants ?? raw.items ?? raw);
    if (!items || items.length === 0) {
      plantsGrid.innerHTML = `<p class="col-span-full text-center text-gray-500">No plants found.</p>`;
      return;
    }
    items.map(mapPlant).forEach(renderCard);
  } catch (e) {
    console.error('Failed to load plants', e);
    plantsGrid.innerHTML = `<p class="col-span-full text-center text-red-600">Failed to load plants.</p>`;
  } finally {
    showSpinner(false);
  }
}
function renderCard(p) {
  if (!p) return;
  const article = document.createElement('article');
  article.className = 'bg-white rounded-2xl border border-gray-100 overflow-hidden shadow';
  article.innerHTML = `
    <img src="${p.img}" alt="${escapeHtml(p.name)}" class="w-full object-cover aspect-[4/3]">
    <div class="p-4 space-y-2">
      <h4 class="font-semibold cursor-pointer text-sm hover:text-brand" data-id="${p.id}">${escapeHtml(p.name)}</h4>
      <p class="text-xs text-gray-600 line-clamp-2">${escapeHtml(p.desc)}</p>
      <div class="flex items-center justify-between text-sm mt-2">
        <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700">${escapeHtml(p.category)}</span>
        <span class="font-semibold">${money(p.price)}</span>
      </div>
      <button class="mt-3 w-full inline-block px-3 py-2 rounded-xl bg-green-600 text-white text-sm" data-add="${p.id}">Add to Cart</button>
    </div>
  `;

  article.querySelector('h4')?.addEventListener('click', () => openModal(p.id));
  article.querySelector('[data-add]')?.addEventListener('click', () => addToCart(p));

  plantsGrid.appendChild(article);
}

async function openModal(id) {
  modalTitle.textContent = 'Plant Detail';
  modalBody.innerHTML = `<div class="w-full flex justify-center py-8"><div class="spinner"></div></div>`;
  modalOverlay.classList.remove('hidden');
  modalOverlay.classList.add('flex');

  try {
    const raw = await fetchJSON(API.plantDetail(id));
    const data = (raw && raw.data) ? raw.data : raw;
    const p = mapPlant(data);
    modalTitle.textContent = p.name;
    modalBody.innerHTML = `
      <img src="${p.img}" alt="${escapeHtml(p.name)}" class="w-full rounded-xl object-cover aspect-[16/9] mb-3">
      <p class="text-gray-700 mb-3">${escapeHtml(data.long_description ?? data.description ?? p.desc)}</p>
      <div class="flex items-center justify-between mb-3">
        <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700">${escapeHtml(p.category)}</span>
        <span class="font-semibold">${money(p.price)}</span>
      </div>
      <button id="modalAdd" class="w-full inline-block px-4 py-2 rounded-xl bg-brand text-white">Add to Cart</button>
    `;
    document.getElementById('modalAdd')?.addEventListener('click', () => {
      addToCart(p);
      closeModal();
    });
  } catch (e) {
    modalBody.innerHTML = `<p class="text-red-600">Failed to load details.</p>`;
    console.error(e);
  }
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalOverlay.classList.remove('flex');
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
function addToCart(p) {
  if (!p || !p.id) return;
  const existing = cart.get(p.id);
  if (existing) existing.qty += 1;
  else cart.set(p.id, { id: p.id, name: p.name, price: p.price, qty: 1 });
  renderCart();
}

function removeFromCart(id) {
  cart.delete(id);
  renderCart();
}

function renderCart() {
  cartList.innerHTML = '';
  let total = 0;
  if (cart.size === 0) {
    cartList.innerHTML = `<li class="text-sm text-gray-500">Cart is empty</li>`;
  } else {
    for (const item of cart.values()) {
      const line = item.price * item.qty;
      total += line;
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between gap-3';
      li.innerHTML = `
        <div class="min-w-0">
          <div class="font-medium truncate">${escapeHtml(item.name)}</div>
          <div class="text-xs text-gray-500">${item.qty} × ${money(item.price)}</div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-sm font-semibold">${money(line)}</div>
          <button class="text-red-600 hover:text-red-700" aria-label="Remove" data-remove="${item.id}">✕</button>
        </div>
      `;
      li.querySelector('[data-remove]')?.addEventListener('click', () => removeFromCart(item.id));
      cartList.appendChild(li);
    }
  }
  cartTotalEl.textContent = money(total);
}
if (donationForm) {
  donationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thank you for your support! We received your donation request.');
    donationForm.reset();
  });
}
(async function init() {
  await loadCategories();
  await loadPlants();
})();
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
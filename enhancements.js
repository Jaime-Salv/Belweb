import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const SUPABASE_URL = 'https://bcyvxxegkguygdbvxoth.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wILGSQL-gq4YMoZSeJ8rAQ_oviCl8BB';
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
let session = null;
let leafletMap = null;
let placeMarkers = [];
let draftTimer = null;

const q = (s) => document.querySelector(s);
const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function injectStylesheet(href, id) {
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet'; link.href = href; document.head.appendChild(link);
}

function injectScript(src, id) {
  if (document.getElementById(id)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = id; script.src = src; script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  });
}

function setupPasswordRecovery() {
  const actions = q('.auth-actions');
  if (!actions || q('#forgotPasswordBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'forgotPasswordBtn';
  btn.className = 'text-button';
  btn.type = 'button';
  btn.textContent = 'He olvidado mi contraseña';
  actions.insertAdjacentElement('afterend', btn);
  btn.addEventListener('click', async () => {
    const email = q('#authEmail')?.value.trim().toLowerCase();
    const status = q('#authStatus');
    if (!email) { status.textContent = 'Introduce primero tu correo.'; return; }
    btn.disabled = true;
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: 'https://belw.netlify.app/' });
    status.textContent = error ? `No se pudo enviar: ${error.message}` : 'Te hemos enviado un enlace para crear una contraseña nueva.';
    btn.disabled = false;
  });
}

async function handleRecovery(event) {
  if (event !== 'PASSWORD_RECOVERY') return;
  const first = prompt('Escribe tu nueva contraseña (mínimo 8 caracteres):');
  if (!first || first.length < 8) return alert('La contraseña debe tener al menos 8 caracteres.');
  const second = prompt('Repítela para confirmar:');
  if (first !== second) return alert('Las contraseñas no coinciden.');
  const { error } = await db.auth.updateUser({ password: first });
  alert(error ? `No se pudo cambiar: ${error.message}` : 'Contraseña actualizada correctamente.');
}

async function loadMembersAndCapsuleState() {
  if (!session?.user) return;
  const { data: members } = await db.from('couple_members').select('id,display_name');
  const ready = (members || []).length >= 2;
  const newBtn = q('#newCapsuleBtn');
  const saveBtn = q('#saveCapsuleBtn');
  if (newBtn) {
    newBtn.disabled = !ready;
    newBtn.title = ready ? '' : 'Bel todavía debe crear y confirmar su cuenta.';
  }
  if (saveBtn) saveBtn.disabled = !ready;
  let warning = q('#capsuleMemberWarning');
  if (!warning && q('#capsulesSection .capsule-toolbar')) {
    warning = document.createElement('p'); warning.id = 'capsuleMemberWarning'; warning.className = 'inline-warning';
    q('#capsulesSection .capsule-toolbar').insertAdjacentElement('afterend', warning);
  }
  if (warning) {
    warning.textContent = ready ? '' : '⚠️ Las cápsulas se activarán cuando Bel cree y confirme su cuenta.';
    warning.hidden = ready;
  }
  if (!ready && q('#capsuleFormStatus')) q('#capsuleFormStatus').textContent = 'Bel todavía no tiene una cuenta activa y no puede recibir la cápsula.';
  await restoreDraft();
}

async function restoreDraft() {
  if (!session?.user) return;
  const { data } = await db.from('capsule_drafts').select('*').eq('user_id', session.user.id).maybeSingle();
  if (!data) return;
  if (q('#capsuleTitle') && !q('#capsuleTitle').value) q('#capsuleTitle').value = data.title || '';
  if (q('#capsuleMessage') && !q('#capsuleMessage').value) q('#capsuleMessage').value = data.message || '';
  if (q('#capsuleDate') && !q('#capsuleDate').value) q('#capsuleDate').value = data.open_date || '';
  if (q('#secretDate')) q('#secretDate').checked = Boolean(data.secret_date);
}

function setupDraftAutosave() {
  ['#capsuleTitle','#capsuleMessage','#capsuleDate','#secretDate'].forEach(sel => {
    q(sel)?.addEventListener('input', () => {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(saveDraft, 500);
    });
    q(sel)?.addEventListener('change', () => {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(saveDraft, 200);
    });
  });
}

async function saveDraft() {
  if (!session?.user) return;
  await db.from('capsule_drafts').upsert({
    user_id: session.user.id,
    title: q('#capsuleTitle')?.value || '',
    message: q('#capsuleMessage')?.value || '',
    open_date: q('#capsuleDate')?.value || null,
    secret_date: Boolean(q('#secretDate')?.checked),
    updated_at: new Date().toISOString()
  });
}

function limitHomeGallery() {
  const grid = q('#galleryGrid');
  const section = q('#gallerySection');
  if (!grid || !section) return;
  const apply = () => {
    [...grid.children].forEach((el, i) => el.classList.toggle('home-gallery-hidden', i >= 10));
    let link = q('#fullGalleryLink');
    if (!link) {
      link = document.createElement('a');
      link.id = 'fullGalleryLink';
      link.className = 'primary-btn gallery-full-link';
      link.href = '/galeria.html';
      link.textContent = 'Ver galería completa 📷';
      grid.insertAdjacentElement('afterend', link);
    }
    link.hidden = grid.children.length === 0;
  };
  new MutationObserver(apply).observe(grid, { childList: true });
  apply();
}

function setupUnifiedMapSection() {
  const travel = q('#travelSection');
  const food = q('#foodSection');
  if (!travel) return;
  food?.classList.add('hidden');
  const navTravel = q('a[href="#travelSection"]');
  if (navTravel) navTravel.textContent = '🗺️ Nuestro mapa';
  travel.innerHTML = `
    <div class="section-heading"><span>NUESTRO MAPA PENDIENTE</span><h2>Viajes, restaurantes y lugares especiales</h2><p>Un único mapa para todo lo que queremos vivir juntos.</p></div>
    <div class="map-toolbar card">
      <input id="placeSearchInput" class="field-control" placeholder="Buscar ciudad, restaurante o lugar…">
      <button id="placeSearchBtn" class="secondary-btn">Buscar</button>
      <select id="placeCategory" class="field-control"><option value="travel">✈️ Viaje</option><option value="restaurant">🍽️ Restaurante</option><option value="cafe">☕ Cafetería</option><option value="escape">🏖️ Escapada</option><option value="special">❤️ Lugar especial</option></select>
    </div>
    <p id="placeSearchStatus" class="form-status"></p>
    <div id="placeSearchResults" class="place-results"></div>
    <div id="coupleMap" class="couple-map"></div>
    <div class="place-filter-row"><button data-place-filter="all" class="active">Todos</button><button data-place-filter="travel">Viajes</button><button data-place-filter="restaurant">Comer</button><button data-place-filter="visited">Visitados</button></div>
    <div id="placesGrid" class="places-grid"></div>`;
  q('#placeSearchBtn')?.addEventListener('click', searchPlace);
  q('#placeSearchInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') searchPlace(); });
  q('.place-filter-row')?.addEventListener('click', e => {
    const btn = e.target.closest('button[data-place-filter]'); if (!btn) return;
    q('.place-filter-row .active')?.classList.remove('active'); btn.classList.add('active'); renderPlaces(btn.dataset.placeFilter);
  });
  initLeaflet().then(loadPlaces);
}

async function initLeaflet() {
  injectStylesheet('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leafletCss');
  await injectScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'leafletJs');
  if (!window.L || leafletMap) return;
  leafletMap = window.L.map('coupleMap').setView([37.2, -5.9], 5);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(leafletMap);
}

async function searchPlace() {
  const value = q('#placeSearchInput')?.value.trim();
  const status = q('#placeSearchStatus');
  if (!value) return;
  status.textContent = 'Buscando…';
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(value)}`, { headers: { 'Accept-Language': 'es' } });
    const results = await response.json();
    status.textContent = results.length ? 'Selecciona el resultado correcto.' : 'No se encontraron lugares.';
    q('#placeSearchResults').innerHTML = results.map((r, i) => `<button class="place-result" data-i="${i}"><strong>${esc(r.name || r.display_name.split(',')[0])}</strong><small>${esc(r.display_name)}</small></button>`).join('');
    q('#placeSearchResults').onclick = async e => {
      const btn = e.target.closest('[data-i]'); if (!btn) return;
      const r = results[Number(btn.dataset.i)];
      const notes = prompt('Notas opcionales sobre este lugar:') || '';
      const { error } = await db.from('shared_places').insert({
        created_by: session.user.id,
        name: r.name || r.display_name.split(',')[0],
        category: q('#placeCategory').value,
        address: r.display_name,
        latitude: Number(r.lat), longitude: Number(r.lon), notes
      });
      status.textContent = error ? error.message : 'Lugar añadido al mapa ❤️';
      q('#placeSearchResults').innerHTML = '';
      if (!error) loadPlaces();
    };
  } catch {
    status.textContent = 'No se pudo consultar el buscador ahora mismo.';
  }
}

let allPlaces = [];
async function loadPlaces() {
  if (!session?.user) return;
  const { data, error } = await db.from('shared_places').select('*').order('created_at', { ascending: false });
  if (error) return;
  allPlaces = data || [];
  renderPlaces('all');
}

function renderPlaces(filter='all') {
  const filtered = allPlaces.filter(p => filter === 'all' || (filter === 'visited' ? p.status === 'visited' : p.category === filter));
  const icons = {travel:'✈️',restaurant:'🍽️',cafe:'☕',escape:'🏖️',special:'❤️'};
  const grid = q('#placesGrid');
  if (grid) grid.innerHTML = filtered.map(p => `<article class="place-card card"><div class="place-card-icon">${icons[p.category] || '📍'}</div><div><span>${esc(p.status)}</span><h3>${esc(p.name)}</h3><p>${esc(p.address || '')}</p>${p.notes ? `<small>${esc(p.notes)}</small>` : ''}<div class="place-actions"><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}">Abrir en Google Maps</a><button data-visit="${p.id}">${p.status === 'visited' ? 'Visitado ✓' : 'Marcar visitado'}</button></div></div></article>`).join('') || '<p>No hay lugares en este filtro todavía.</p>';
  if (grid) grid.onclick = async e => {
    const btn = e.target.closest('[data-visit]'); if (!btn) return;
    await db.from('shared_places').update({ status:'visited', visited_at:new Date().toISOString().slice(0,10), updated_at:new Date().toISOString() }).eq('id', btn.dataset.visit);
    loadPlaces();
  };
  if (!leafletMap || !window.L) return;
  placeMarkers.forEach(m => m.remove()); placeMarkers = [];
  filtered.forEach(p => {
    const marker = window.L.marker([p.latitude,p.longitude]).addTo(leafletMap).bindPopup(`<strong>${esc(p.name)}</strong><br>${esc(p.address || '')}`);
    placeMarkers.push(marker);
  });
  if (filtered.length) leafletMap.fitBounds(filtered.map(p => [p.latitude,p.longitude]), { padding:[30,30], maxZoom:12 });
}

setupPasswordRecovery();
setupDraftAutosave();
limitHomeGallery();
setupUnifiedMapSection();

db.auth.onAuthStateChange((event, next) => {
  session = next;
  handleRecovery(event);
  setTimeout(() => { loadMembersAndCapsuleState(); loadPlaces(); }, 0);
});
const { data: { session: initialSession } } = await db.auth.getSession();
session = initialSession;
await loadMembersAndCapsuleState();

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const SUPABASE_URL = 'https://bcyvxxegkguygdbvxoth.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wILGSQL-gq4YMoZSeJ8rAQ_oviCl8BB';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $s = (q) => document.querySelector(q);
let currentUser = null;
let currentMember = null;
let members = [];

function status(message, error = false) {
  const el = $s('#authStatus');
  if (!el) return;
  el.textContent = message;
  el.style.color = error ? '#a52a45' : '';
}

async function signUp() {
  const email = $s('#authEmail').value.trim().toLowerCase();
  const password = $s('#authPassword').value;
  if (!email || password.length < 8) return status('Introduce un correo válido y una contraseña de al menos 8 caracteres.', true);
  status('Creando cuenta...');
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: 'https://belw.netlify.app/' }
  });
  if (error) return status(error.message, true);
  status('Cuenta creada. Revisa tu correo para confirmar el acceso.');
}

async function signIn() {
  const email = $s('#authEmail').value.trim().toLowerCase();
  const password = $s('#authPassword').value;
  status('Entrando...');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return status('No se pudo entrar: ' + error.message, true);
}

async function signOut() { await supabase.auth.signOut(); }

async function bootSession(session) {
  if (!session?.user) {
    currentUser = null;
    currentMember = null;
    $s('#authGate').classList.remove('hidden');
    $s('#privateApp').classList.add('hidden');
    return;
  }

  currentUser = session.user;
  const { data: member, error } = await supabase
    .from('couple_members')
    .select('id, display_name')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (error || !member) {
    await supabase.auth.signOut();
    status('Este correo no está autorizado para acceder a este espacio.', true);
    return;
  }

  currentMember = member;
  const { data: allMembers } = await supabase.from('couple_members').select('id, display_name');
  members = allMembers || [];
  $s('#sessionName').textContent = currentMember.display_name;
  $s('#authGate').classList.add('hidden');
  $s('#privateApp').classList.remove('hidden');
  await Promise.all([loadCapsules(), loadSimpleList('travel'), loadSimpleList('food'), loadGallery()]);
}

function memberName(id) { return members.find(m => m.id === id)?.display_name || 'Nosotros'; }
function otherMember() { return members.find(m => m.id !== currentUser.id); }

async function loadCapsules() {
  const grid = $s('#capsulesGrid');
  grid.innerHTML = '<p class="remote-loading">Cargando cápsulas...</p>';
  const { data, error } = await supabase
    .from('capsules')
    .select('id,author_id,recipient_id,title,open_at,secret_date,created_at,capsule_contents(message)')
    .order('created_at', { ascending: false });
  if (error) { grid.innerHTML = '<p class="remote-loading">No se pudieron cargar las cápsulas.</p>'; return; }
  grid.innerHTML = '';
  for (const c of data || []) {
    const open = new Date(c.open_at) <= new Date();
    const own = c.author_id === currentUser.id;
    const content = Array.isArray(c.capsule_contents) ? c.capsule_contents[0] : c.capsule_contents;
    const days = Math.max(0, Math.ceil((new Date(c.open_at) - new Date()) / 86400000));
    const dateText = c.secret_date && !open && !own ? 'Fecha secreta' : new Date(c.open_at).toLocaleDateString('es-ES', {day:'2-digit',month:'long',year:'numeric'});
    const card = document.createElement('article');
    card.className = `capsule-card ${open ? 'unlocked' : 'locked'}`;
    card.innerHTML = `<div class="capsule-icon">${open ? '💌' : '🔒'}</div><div class="capsule-meta">De ${memberName(c.author_id)} para ${memberName(c.recipient_id)}</div><h3>${escapeHtml(c.title)}</h3><p>${open ? 'Esta cápsula ya puede abrirse.' : `Quedan ${days} días.`}</p><div class="capsule-date">${dateText}</div><button class="${open ? 'primary-btn' : 'secondary-btn'} capsule-open-btn" ${open || own ? '' : 'disabled'}>${open || own ? 'Abrir cápsula ❤️' : 'Todavía no 🔒'}</button>`;
    card.querySelector('button').addEventListener('click', () => showSharedModal('💌', c.title, content?.message || 'El contenido sigue protegido.'));
    grid.appendChild(card);
  }
  if (!data?.length) grid.innerHTML = '<p class="remote-loading">Todavía no habéis creado ninguna cápsula.</p>';
}

async function saveCapsule(event) {
  event.stopImmediatePropagation();
  event.preventDefault();
  const title = $s('#capsuleTitle').value.trim();
  const message = $s('#capsuleMessage').value.trim();
  const openAt = $s('#capsuleDate').value;
  const secretDate = $s('#secretDate').checked;
  const recipient = otherMember();
  const formStatus = $s('#capsuleFormStatus');
  if (!title || !message || !openAt || !recipient) return formStatus.textContent = 'Falta título, mensaje o fecha.';
  formStatus.textContent = 'Guardando cápsula...';
  const { data: capsule, error } = await supabase.from('capsules').insert({author_id: currentUser.id, recipient_id: recipient.id, title, open_at: new Date(openAt + 'T12:00:00').toISOString(), secret_date: secretDate}).select('id').single();
  if (error) return formStatus.textContent = error.message;
  const { error: contentError } = await supabase.from('capsule_contents').insert({capsule_id: capsule.id, message});
  if (contentError) return formStatus.textContent = contentError.message;
  formStatus.textContent = 'Cápsula guardada 🔒';
  await loadCapsules();
  setTimeout(() => document.querySelector('[data-close-capsule]')?.click(), 600);
}

async function loadSimpleList(kind) {
  const isTravel = kind === 'travel';
  const table = isTravel ? 'travel_wishlist' : 'food_wishlist';
  const field = isTravel ? 'destination' : 'place';
  const grid = $s(isTravel ? '#travelGrid' : '#foodGrid');
  const { data } = await supabase.from(table).select(`id,${field},created_by,created_at`).order('created_at', {ascending:false});
  grid.innerHTML = (data || []).map(row => `<div class="shared-item"><span>${isTravel ? '✈️' : '🍽️'}</span><div><strong>${escapeHtml(row[field])}</strong><small> Añadido por ${memberName(row.created_by)}</small></div></div>`).join('') || '<p class="remote-loading">Todavía no hay nada en esta lista.</p>';
}

async function addSimple(kind, event) {
  event.stopImmediatePropagation();
  event.preventDefault();
  const isTravel = kind === 'travel';
  const input = $s(isTravel ? '#travelInput' : '#foodInput');
  const value = input.value.trim();
  if (!value) return;
  const table = isTravel ? 'travel_wishlist' : 'food_wishlist';
  const payload = isTravel ? {destination:value, created_by:currentUser.id} : {place:value, created_by:currentUser.id};
  const { error } = await supabase.from(table).insert(payload);
  if (!error) { input.value=''; await loadSimpleList(kind); }
}

async function loadGallery() {
  const grid = $s('#galleryGrid');
  if (!grid) return;
  const { data, error } = await supabase.from('gallery_media').select('*').order('memory_date',{ascending:false});
  if (error) return;
  const items = await Promise.all((data || []).map(async row => {
    const { data: signed } = await supabase.storage.from('couple-gallery').createSignedUrl(row.storage_path, 3600);
    return {...row, url:signed?.signedUrl, author:memberName(row.uploaded_by), type:row.media_type, memoryDate:row.memory_date};
  }));
  grid.innerHTML = '';
  for (const item of items) {
    const card = document.createElement('article');
    card.className='gallery-card';
    const media = item.type === 'video' ? `<video class="media-content" src="${item.url}" muted playsinline></video>` : `<img class="media-content" src="${item.url}" alt="${escapeHtml(item.title)}">`;
    card.innerHTML=`<button class="gallery-media-button">${media}<span class="gallery-type-badge">${item.type==='video'?'▶ Vídeo':'Foto'}</span>${item.favorite?'<span class="gallery-favorite">❤️</span>':''}</button><div class="gallery-card-copy"><span>${item.author} · ${new Date(item.memoryDate+'T12:00:00').toLocaleDateString('es-ES')}</span><h3>${escapeHtml(item.title)}</h3><p>${whatsappItalics(item.description||'')}</p></div>`;
    card.querySelector('button').addEventListener('click',()=>showSharedMedia(item));
    grid.appendChild(card);
  }
  $s('#galleryEmpty')?.classList.toggle('hidden', items.length>0);
}

async function uploadMedia(event) {
  event.stopImmediatePropagation();
  event.preventDefault();
  const file = $s('#mediaUploader')?.files?.[0];
  const title = $s('#mediaTitle')?.value.trim();
  const memoryDate = $s('#mediaDate')?.value;
  const statusEl = $s('#uploadFormStatus');
  if (!file || !title || !memoryDate) return statusEl.textContent='Selecciona archivo, título y fecha.';
  statusEl.textContent='Subiendo recuerdo...';
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${currentUser.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('couple-gallery').upload(path,file,{contentType:file.type,upsert:false});
  if (uploadError) return statusEl.textContent=uploadError.message;
  const { error } = await supabase.from('gallery_media').insert({uploaded_by:currentUser.id,media_type:file.type.startsWith('video/')?'video':'image',storage_path:path,title,description:$s('#mediaDescription').value.trim(),memory_date:memoryDate,favorite:$s('#mediaFavorite').checked});
  if (error) { await supabase.storage.from('couple-gallery').remove([path]); return statusEl.textContent=error.message; }
  statusEl.textContent='Recuerdo guardado ❤️';
  await loadGallery();
  setTimeout(()=>document.querySelector('[data-close-upload]')?.click(),600);
}

async function requestAssistance(event) {
  event.stopImmediatePropagation();
  const other = otherMember();
  if (!other) return;
  await supabase.from('assistance_requests').insert({requested_by:currentUser.id,requested_from:other.id,assistance_type:'mimos',message:`${currentMember.display_name.toUpperCase()} NECESITA ASISTENCIA MIMAL`});
  const button=$s('#startBtn');
  button.textContent=`${other.display_name} ha sido avisad${other.display_name==='Bel'?'a':'o'} ❤️`;
  $s('#emergencySection').classList.remove('hidden');
}

function showSharedModal(icon,title,text){
  $s('#modalIcon').textContent=icon; $s('#modalTitle').textContent=title; $s('#modalText').innerHTML=whatsappItalics(text); $s('#modal').classList.remove('hidden');
}
function showSharedMedia(item){
  const viewer=$s('#mediaViewer'); if(!viewer) return;
  $s('#viewerMedia').innerHTML=item.type==='video'?`<video class="media-content expanded" src="${item.url}" controls autoplay></video>`:`<img class="media-content expanded" src="${item.url}" alt="${escapeHtml(item.title)}">`;
  $s('#viewerTitle').textContent=item.title; $s('#viewerDescription').innerHTML=whatsappItalics(item.description||''); $s('#viewerMeta').textContent=`${item.author} · ${new Date(item.memoryDate+'T12:00:00').toLocaleDateString('es-ES')}`; viewer.classList.remove('hidden');
}

function openUploadUi(){ $s('#uploadModal')?.classList.remove('hidden'); document.body.style.overflow='hidden'; }
function closeUploadUi(){ $s('#uploadModal')?.classList.add('hidden'); document.body.style.overflow=''; }
$s('#openUploadBtn')?.addEventListener('click', openUploadUi);
document.querySelectorAll('[data-close-upload]').forEach(el=>el.addEventListener('click', closeUploadUi));
document.querySelectorAll('[data-close-viewer]').forEach(el=>el.addEventListener('click',()=>{ $s('#mediaViewer')?.classList.add('hidden'); document.body.style.overflow=''; }));
$s('#mediaUploader')?.addEventListener('change',()=>{ const f=$s('#mediaUploader').files?.[0]; const preview=$s('#uploadPreview'); if(!f||!preview)return; const url=URL.createObjectURL(f); preview.innerHTML=f.type.startsWith('video/')?`<video src="${url}" controls></video>`:`<img src="${url}" alt="Vista previa">`; preview.classList.remove('hidden'); });

$s('#signInBtn').addEventListener('click', signIn);
$s('#signUpBtn').addEventListener('click', signUp);
$s('#signOutBtn').addEventListener('click', signOut);
$s('#saveCapsuleBtn')?.addEventListener('click', saveCapsule, true);
$s('#addTravelBtn')?.addEventListener('click', e => addSimple('travel', e), true);
$s('#addFoodBtn')?.addEventListener('click', e => addSimple('food', e), true);
$s('#saveMediaBtn')?.addEventListener('click', uploadMedia, true);
$s('#startBtn')?.addEventListener('click', requestAssistance, true);

supabase.auth.onAuthStateChange((_event, session) => bootSession(session));
const { data: { session } } = await supabase.auth.getSession();
await bootSession(session);

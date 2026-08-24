import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const SUPABASE_URL = 'https://bcyvxxegkguygdbvxoth.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wILGSQL-gq4YMoZSeJ8rAQ_oviCl8BB';
const supabaseAuthFix = createClient(SUPABASE_URL, SUPABASE_KEY);

function ensureStyles() {
  if (document.querySelector('#auth-fix-styles')) return;
  const style = document.createElement('style');
  style.id = 'auth-fix-styles';
  style.textContent = `
    .password-wrap{position:relative;display:flex;align-items:center}.password-wrap .field-control{padding-right:46px;width:100%}.password-eye{position:absolute;right:8px;border:0;background:transparent;cursor:pointer;font-size:1.05rem;padding:8px;border-radius:10px}.auth-helper-row{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap}.auth-link-btn{border:0;background:transparent;padding:0;color:#a52a45;font:inherit;font-size:.9rem;font-weight:700;cursor:pointer;text-decoration:underline;text-underline-offset:3px}.password-reset-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(46,31,36,.42);backdrop-filter:blur(8px)}.password-reset-overlay.hidden{display:none}.password-reset-card{width:min(460px,100%);background:rgba(255,252,252,.97);border:1px solid rgba(119,80,90,.14);box-shadow:0 24px 70px rgba(78,43,52,.22);border-radius:26px;padding:28px;position:relative}.password-reset-card h2{margin:6px 0 8px;font-family:'Playfair Display',serif}.password-reset-card p{color:#6f5b61;line-height:1.55}.password-reset-close{position:absolute;right:16px;top:14px;border:0;background:transparent;font-size:1.5rem;cursor:pointer}.reset-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.reset-actions button{flex:1;min-width:150px}.reset-status{min-height:1.4em;margin-top:12px;font-size:.92rem}.password-tip{font-size:.82rem;color:#8c737a;margin-top:6px}.session-password-btn{border:0;background:transparent;color:inherit;font:inherit;font-size:.78rem;font-weight:700;cursor:pointer;padding:3px 5px;opacity:.85}
  `;
  document.head.appendChild(style);
}

function wrapPasswordInput(input) {
  if (!input || input.closest('.password-wrap')) return;
  const wrap = document.createElement('div');
  wrap.className = 'password-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const eye = document.createElement('button');
  eye.type = 'button';
  eye.className = 'password-eye';
  eye.setAttribute('aria-label', 'Mostrar contraseña');
  eye.textContent = '👁️';
  eye.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.textContent = show ? '🙈' : '👁️';
    eye.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
  wrap.appendChild(eye);
}

function ensureResetModal() {
  let overlay = document.querySelector('#passwordResetOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'passwordResetOverlay';
  overlay.className = 'password-reset-overlay hidden';
  overlay.innerHTML = `
    <div class="password-reset-card" role="dialog" aria-modal="true" aria-labelledby="resetTitle">
      <button type="button" class="password-reset-close" id="closePasswordReset">×</button>
      <div class="modal-icon">🔑</div>
      <span class="eyebrow">ACCESO A VUESTRA CAJITA</span>
      <h2 id="resetTitle">Crear o recuperar contraseña</h2>
      <p id="resetIntro">No necesitas conocer la contraseña anterior. Te enviaremos un enlace seguro al correo de tu cuenta.</p>
      <div id="resetEmailStep">
        <label class="field-label" for="resetEmail">Correo</label>
        <input id="resetEmail" class="field-control" type="email" autocomplete="email" placeholder="tu@email.com">
        <div class="reset-actions"><button id="sendResetEmailBtn" class="primary-btn" type="button">Enviar enlace</button></div>
      </div>
      <div id="resetPasswordStep" class="hidden">
        <label class="field-label" for="newPassword">Nueva contraseña</label>
        <input id="newPassword" class="field-control" type="password" autocomplete="new-password" minlength="8" placeholder="Mínimo 8 caracteres">
        <label class="field-label" for="repeatPassword" style="margin-top:12px">Repite la contraseña</label>
        <input id="repeatPassword" class="field-control" type="password" autocomplete="new-password" minlength="8" placeholder="Repite la contraseña">
        <div class="password-tip">Puedes pulsar el ojo para comprobar lo que has escrito.</div>
        <div class="reset-actions"><button id="saveNewPasswordBtn" class="primary-btn" type="button">Guardar nueva contraseña</button></div>
      </div>
      <p id="resetStatus" class="reset-status" aria-live="polite"></p>
    </div>`;
  document.body.appendChild(overlay);
  wrapPasswordInput(overlay.querySelector('#newPassword'));
  wrapPasswordInput(overlay.querySelector('#repeatPassword'));
  overlay.querySelector('#closePasswordReset').addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
  overlay.querySelector('#sendResetEmailBtn').addEventListener('click', sendRecoveryEmail);
  overlay.querySelector('#saveNewPasswordBtn').addEventListener('click', saveNewPassword);
  return overlay;
}

function setResetStatus(message, error = false) {
  const el = document.querySelector('#resetStatus');
  if (!el) return;
  el.textContent = message;
  el.style.color = error ? '#a52a45' : '#506b5b';
}

async function openResetModal(forcePasswordStep = false) {
  const overlay = ensureResetModal();
  const emailInput = overlay.querySelector('#resetEmail');
  const authEmail = document.querySelector('#authEmail');
  if (authEmail?.value && !emailInput.value) emailInput.value = authEmail.value.trim();
  const { data: { session } } = await supabaseAuthFix.auth.getSession();
  const passwordStep = forcePasswordStep || Boolean(session?.user);
  overlay.querySelector('#resetEmailStep').classList.toggle('hidden', passwordStep);
  overlay.querySelector('#resetPasswordStep').classList.toggle('hidden', !passwordStep);
  overlay.querySelector('#resetIntro').textContent = passwordStep
    ? 'Define una nueva contraseña para esta cuenta. No necesitas recordar ninguna anterior.'
    : 'No necesitas conocer la contraseña anterior. Te enviaremos un enlace seguro al correo de tu cuenta.';
  setResetStatus('');
  overlay.classList.remove('hidden');
  setTimeout(() => (passwordStep ? overlay.querySelector('#newPassword') : emailInput)?.focus(), 50);
}

async function sendRecoveryEmail() {
  const email = document.querySelector('#resetEmail')?.value.trim().toLowerCase();
  if (!email) return setResetStatus('Escribe tu correo.', true);
  const button = document.querySelector('#sendResetEmailBtn');
  button.disabled = true;
  button.textContent = 'Enviando...';
  setResetStatus('');
  const redirectTo = `${window.location.origin}${window.location.pathname}?recovery=1`;
  const { error } = await supabaseAuthFix.auth.resetPasswordForEmail(email, { redirectTo });
  button.disabled = false;
  button.textContent = 'Enviar enlace';
  if (error) {
    const message = /rate limit/i.test(error.message) ? 'Se han enviado demasiados correos seguidos. Espera unos minutos y vuelve a intentarlo.' : error.message;
    return setResetStatus(message, true);
  }
  setResetStatus('Enlace enviado. Abre el correo más reciente y vuelve a esta web desde ese enlace.');
}

async function saveNewPassword() {
  const password = document.querySelector('#newPassword')?.value || '';
  const repeat = document.querySelector('#repeatPassword')?.value || '';
  if (password.length < 8) return setResetStatus('La contraseña debe tener al menos 8 caracteres.', true);
  if (password !== repeat) return setResetStatus('Las dos contraseñas no coinciden.', true);
  const button = document.querySelector('#saveNewPasswordBtn');
  button.disabled = true;
  button.textContent = 'Guardando...';
  const { error } = await supabaseAuthFix.auth.updateUser({ password });
  button.disabled = false;
  button.textContent = 'Guardar nueva contraseña';
  if (error) return setResetStatus(error.message, true);
  setResetStatus('Contraseña guardada correctamente ❤️ Ya puedes entrar con correo y contraseña.');
  const authPassword = document.querySelector('#authPassword');
  if (authPassword) authPassword.value = '';
  history.replaceState({}, '', window.location.pathname + window.location.hash);
  setTimeout(() => document.querySelector('#passwordResetOverlay')?.classList.add('hidden'), 1400);
}

function enhanceLogin() {
  const password = document.querySelector('#authPassword');
  wrapPasswordInput(password);
  const actions = document.querySelector('.auth-actions');
  if (actions && !document.querySelector('#forgotPasswordBtn')) {
    const row = document.createElement('div');
    row.className = 'auth-helper-row';
    row.innerHTML = `<button id="forgotPasswordBtn" type="button" class="auth-link-btn">¿No tienes contraseña o la has olvidado?</button><span style="font-size:.82rem;color:#8c737a">Puedes crear una nueva sin saber la anterior</span>`;
    actions.insertAdjacentElement('afterend', row);
    row.querySelector('#forgotPasswordBtn').addEventListener('click', () => openResetModal(false));
  }
  const sessionChip = document.querySelector('.session-chip');
  if (sessionChip && !document.querySelector('#changePasswordBtn')) {
    const button = document.createElement('button');
    button.id = 'changePasswordBtn';
    button.type = 'button';
    button.className = 'session-password-btn';
    button.textContent = '🔑 Contraseña';
    button.addEventListener('click', () => openResetModal(true));
    sessionChip.insertBefore(button, sessionChip.querySelector('#signOutBtn'));
  }
  const signIn = document.querySelector('#signInBtn');
  if (signIn && !signIn.dataset.authFix) {
    signIn.dataset.authFix = '1';
    signIn.addEventListener('click', () => {
      setTimeout(() => {
        const status = document.querySelector('#authStatus');
        if (status && /invalid login credentials|credenciales|contraseña/i.test(status.textContent)) {
          status.textContent = 'La cuenta existe, pero esa contraseña no es válida. Usa “¿No tienes contraseña o la has olvidado?” para crear una nueva.';
        }
      }, 700);
    });
  }
}

ensureStyles();
ensureResetModal();
enhanceLogin();
new MutationObserver(enhanceLogin).observe(document.body, { childList: true, subtree: true });

supabaseAuthFix.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') openResetModal(true);
});

const isRecoveryUrl = new URLSearchParams(window.location.search).get('recovery') === '1' || window.location.hash.includes('type=recovery');
if (isRecoveryUrl) {
  setTimeout(async () => {
    const { data: { session } } = await supabaseAuthFix.auth.getSession();
    if (session?.user) openResetModal(true);
  }, 300);
}

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const SUPABASE_URL = 'https://bcyvxxegkguygdbvxoth.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wILGSQL-gq4YMoZSeJ8rAQ_oviCl8BB';
const authClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (s) => document.querySelector(s);

function setStatus(message, error = false) {
  const el = $('#passwordResetStatus');
  if (!el) return;
  el.textContent = message;
  el.style.color = error ? '#a52a45' : '#506b5b';
}

function setMode(mode) {
  const emailStep = $('#passwordResetEmailStep');
  const passwordStep = $('#passwordResetNewStep');
  const intro = $('#passwordResetIntro');
  if (!emailStep || !passwordStep) return;
  const isPassword = mode === 'password';
  emailStep.classList.toggle('hidden', isPassword);
  passwordStep.classList.toggle('hidden', !isPassword);
  intro.textContent = isPassword
    ? 'Escribe una contraseña nueva. No necesitas conocer la anterior.'
    : 'Te enviaremos un enlace seguro a tu correo para que puedas crear una contraseña nueva.';
  setStatus('');
}

function openReset(mode = 'email') {
  const overlay = $('#passwordResetOverlay');
  if (!overlay) return;
  const authEmail = $('#authEmail')?.value?.trim();
  if (authEmail && !$('#passwordResetEmail')?.value) $('#passwordResetEmail').value = authEmail;
  setMode(mode);
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => (mode === 'password' ? $('#newPassword') : $('#passwordResetEmail'))?.focus(), 50);
}

function closeReset() {
  const overlay = $('#passwordResetOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}

function togglePassword(input, button) {
  if (!input || !button) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.textContent = show ? 'Ocultar' : 'Mostrar';
  button.setAttribute('aria-pressed', String(show));
}

async function sendRecovery() {
  const email = $('#passwordResetEmail')?.value?.trim().toLowerCase();
  if (!email) return setStatus('Escribe tu correo.', true);
  const button = $('#sendPasswordResetBtn');
  button.disabled = true;
  button.textContent = 'Enviando…';
  const redirectTo = `${window.location.origin}/?password_recovery=1`;
  const { error } = await authClient.auth.resetPasswordForEmail(email, { redirectTo });
  button.disabled = false;
  button.textContent = 'Enviar enlace para crear contraseña';
  if (error) {
    const msg = /rate limit/i.test(error.message)
      ? 'Se han enviado demasiados correos seguidos. Espera unos minutos y vuelve a intentarlo.'
      : error.message;
    return setStatus(msg, true);
  }
  setStatus('Correo enviado. Abre el mensaje más reciente y pulsa el enlace para volver aquí y crear tu contraseña.');
}

async function sendMagicLink() {
  const email = $('#authEmail')?.value?.trim().toLowerCase() || $('#passwordResetEmail')?.value?.trim().toLowerCase();
  if (!email) {
    openReset('email');
    return setStatus('Escribe primero tu correo.', true);
  }
  const button = $('#sendMagicLinkBtn');
  if (button) { button.disabled = true; button.textContent = 'Enviando…'; }
  const { error } = await authClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/` }
  });
  if (button) { button.disabled = false; button.textContent = 'Entrar con enlace mágico'; }
  if (error) return setStatus(error.message, true);
  openReset('email');
  setStatus('Enlace mágico enviado. Abre el correo más reciente.');
}

async function savePassword() {
  const password = $('#newPassword')?.value || '';
  const repeat = $('#repeatNewPassword')?.value || '';
  if (password.length < 8) return setStatus('La contraseña debe tener al menos 8 caracteres.', true);
  if (password !== repeat) return setStatus('Las dos contraseñas no coinciden.', true);
  const button = $('#saveNewPasswordBtn');
  button.disabled = true;
  button.textContent = 'Guardando…';
  const { error } = await authClient.auth.updateUser({ password });
  button.disabled = false;
  button.textContent = 'Guardar nueva contraseña';
  if (error) return setStatus(error.message, true);
  setStatus('Contraseña creada correctamente ❤️ Ya puedes usar correo y contraseña para entrar.');
  history.replaceState({}, '', '/');
  setTimeout(closeReset, 1500);
}

$('#toggleLoginPassword')?.addEventListener('click', () => togglePassword($('#authPassword'), $('#toggleLoginPassword')));
$('#toggleNewPassword')?.addEventListener('click', () => togglePassword($('#newPassword'), $('#toggleNewPassword')));
$('#toggleRepeatPassword')?.addEventListener('click', () => togglePassword($('#repeatNewPassword'), $('#toggleRepeatPassword')));
$('#openPasswordResetBtn')?.addEventListener('click', () => openReset('email'));
$('#sendPasswordResetBtn')?.addEventListener('click', sendRecovery);
$('#sendMagicLinkBtn')?.addEventListener('click', sendMagicLink);
$('#saveNewPasswordBtn')?.addEventListener('click', savePassword);
$('#closePasswordResetBtn')?.addEventListener('click', closeReset);
$('#passwordResetOverlay')?.addEventListener('click', (e) => { if (e.target.id === 'passwordResetOverlay') closeReset(); });

$('#authPassword')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#signInBtn')?.click();
});

$('#signInBtn')?.addEventListener('click', () => {
  setTimeout(() => {
    const text = $('#authStatus')?.textContent || '';
    if (/invalid login credentials/i.test(text)) {
      $('#authStatus').textContent = 'La contraseña no es válida. Usa “No tengo / olvidé mi contraseña” para crear una nueva.';
    }
  }, 600);
});

authClient.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') openReset('password');
  if (event === 'SIGNED_IN' && new URLSearchParams(location.search).get('password_recovery') === '1') {
    openReset('password');
  }
});

const recoveryRequested = new URLSearchParams(location.search).get('password_recovery') === '1' || location.hash.includes('type=recovery');
if (recoveryRequested) {
  setTimeout(async () => {
    const { data: { session } } = await authClient.auth.getSession();
    if (session?.user) openReset('password');
    else {
      openReset('email');
      setStatus('El enlace no ha iniciado la sesión de recuperación. Solicita un enlace nuevo.', true);
    }
  }, 400);
}

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const SUPABASE_URL = 'https://bcyvxxegkguygdbvxoth.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wILGSQL-gq4YMoZSeJ8rAQ_oviCl8BB';
const VAPID_PUBLIC_KEY = 'BIxw84AZsIabK6ijIA_0G7j3xZ4aHXyyIAJk6NYlw-bPGLUfclM826gqscnbWlzCSpo9cVQ8hE6VWGCZ_PWkPKg';
const supabasePush = createClient(SUPABASE_URL, SUPABASE_KEY);

let pushButton;
let currentSession;

function base64UrlToUint8Array(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}

function ensureManifest() {
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.webmanifest';
    document.head.appendChild(link);
  }
}

function ensurePushButton() {
  if (pushButton) return pushButton;
  const nav = document.querySelector('.top-nav');
  if (!nav) return null;
  pushButton = document.createElement('button');
  pushButton.id = 'pushNotificationsBtn';
  pushButton.className = 'push-notification-btn';
  pushButton.type = 'button';
  pushButton.textContent = '🔔 Activar avisos';
  pushButton.addEventListener('click', activatePushNotifications);
  const sessionChip = nav.querySelector('.session-chip');
  nav.insertBefore(pushButton, sessionChip || null);
  return pushButton;
}

function ensurePushStyles() {
  if (document.querySelector('#pushNotificationStyles')) return;
  const style = document.createElement('style');
  style.id = 'pushNotificationStyles';
  style.textContent = `.push-notification-btn{flex:0 0 auto;border:1px solid rgba(119,80,90,.15);border-radius:12px;padding:9px 11px;background:#fff;color:#2b2325;font:inherit;font-size:.82rem;font-weight:700;cursor:pointer}.push-notification-btn.active{background:#fde7eb;color:#bd405a}.push-notification-btn:disabled{opacity:.65;cursor:not-allowed}`;
  document.head.appendChild(style);
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('Este navegador no admite notificaciones web.');
  return navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
}

async function saveSubscription(subscription) {
  const session = currentSession || (await supabasePush.auth.getSession()).data.session;
  if (!session?.user) throw new Error('Necesitas iniciar sesión.');
  const json = subscription.toJSON();
  const { error } = await supabasePush.from('push_subscriptions').upsert({user_id:session.user.id,endpoint:subscription.endpoint,p256dh:json.keys.p256dh,auth:json.keys.auth,user_agent:navigator.userAgent},{onConflict:'endpoint'});
  if (error) throw error;
}

async function updateButtonState() {
  const button = ensurePushButton(); if (!button) return;
  if (!currentSession?.user) { button.hidden = true; return; }
  button.hidden = false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {button.textContent='🔕 No compatible';button.disabled=true;return;}
  if (Notification.permission === 'denied') {button.textContent='🔕 Avisos bloqueados';button.disabled=true;return;}
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {button.textContent='🔔 Avisos activados';button.classList.add('active');await saveSubscription(subscription);} else {button.textContent='🔔 Activar avisos';button.classList.remove('active');button.disabled=false;}
  } catch {button.textContent='🔔 Activar avisos';button.disabled=false;}
}

async function activatePushNotifications() {
  const button=ensurePushButton();button.disabled=true;button.textContent='Activando...';
  try {
    const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('No se concedió permiso para notificaciones.');
    const registration=await registerServiceWorker();let subscription=await registration.pushManager.getSubscription();
    if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToUint8Array(VAPID_PUBLIC_KEY)});
    await saveSubscription(subscription);button.textContent='🔔 Avisos activados';button.classList.add('active');
  } catch(error){console.error(error);button.textContent='⚠️ No se pudo activar';setTimeout(()=>{button.textContent='🔔 Activar avisos';button.disabled=false;},2500);return;}
  button.disabled=false;
}

async function sendAssistancePush() {
  const session=currentSession||(await supabasePush.auth.getSession()).data.session;if(!session?.user)return;
  const{data:members,error}=await supabasePush.from('couple_members').select('id,display_name');if(error)return;
  const me=members.find(member=>member.id===session.user.id);const other=members.find(member=>member.id!==session.user.id);if(!me||!other)return;
  try {
    const response=await fetch(`${SUPABASE_URL}/functions/v1/send-push`,{method:'POST',headers:{'content-type':'application/json',apikey:SUPABASE_KEY,authorization:`Bearer ${session.access_token}`},body:JSON.stringify({targetUserId:other.id,title:'Bel & Jaime ❤️',message:`🚨 ${me.display_name.toUpperCase()} NECESITA ASISTENCIA MIMAL`,url:'/#emergencias',tag:'asistencia-mimal'})});
    if(!response.ok)console.error('Error al enviar push:',await response.text());
  } catch(error){console.error('No se pudo enviar el push:',error);}
}

ensureManifest();ensurePushStyles();registerServiceWorker().catch(()=>{});
const assistanceButton=document.querySelector('#startBtn');assistanceButton?.addEventListener('click',sendAssistancePush,true);
supabasePush.auth.onAuthStateChange((_event,session)=>{currentSession=session;setTimeout(updateButtonState,0);});
const{data:{session}}=await supabasePush.auth.getSession();currentSession=session;await updateButtonState();

for (const href of ['/enhancements.css','/cajita.css']) { const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link); }
import('./enhancements.js').catch(error=>console.error('No se pudieron cargar las mejoras:',error));
import('./cajita-app.js').catch(error=>console.error('No se pudo abrir la cajita:',error));

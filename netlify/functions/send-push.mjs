import webpush from 'web-push';

const json = (statusCode, body) => new Response(JSON.stringify(body), {
  status: statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' }
});

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Método no permitido.' });

  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return json(401, { error: 'Sesión requerida.' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !vapidPublicKey || !vapidPrivateKey) {
    return json(500, { error: 'Notificaciones no configuradas.' });
  }

  const commonHeaders = {
    apikey: supabaseAnonKey,
    authorization,
    'content-type': 'application/json'
  };

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: commonHeaders });
  if (!userResponse.ok) return json(401, { error: 'Sesión no válida.' });
  const caller = await userResponse.json();

  const body = await request.json().catch(() => ({}));
  const targetUserId = body.targetUserId;
  if (!targetUserId || targetUserId === caller.id) return json(400, { error: 'Destinatario no válido.' });

  const membersResponse = await fetch(
    `${supabaseUrl}/rest/v1/couple_members?select=id,display_name`,
    { headers: commonHeaders }
  );
  if (!membersResponse.ok) return json(403, { error: 'No autorizado.' });
  const members = await membersResponse.json();
  const callerMember = members.find(member => member.id === caller.id);
  const targetMember = members.find(member => member.id === targetUserId);
  if (!callerMember || !targetMember) return json(403, { error: 'No autorizado.' });

  const subscriptionsResponse = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?select=endpoint,p256dh,auth&user_id=eq.${encodeURIComponent(targetUserId)}`,
    { headers: commonHeaders }
  );
  if (!subscriptionsResponse.ok) return json(502, { error: 'No se pudieron consultar los dispositivos.' });
  const subscriptions = await subscriptionsResponse.json();

  if (!subscriptions.length) {
    return json(200, { ok: true, delivered: 0, message: `${targetMember.display_name} todavía no ha activado las notificaciones.` });
  }

  webpush.setVapidDetails('mailto:jaime.rugomez@gmail.com', vapidPublicKey, vapidPrivateKey);

  const payload = JSON.stringify({
    title: body.title || 'Bel & Jaime ❤️',
    body: body.message || `${callerMember.display_name} te ha enviado una notificación.`,
    url: body.url || '/',
    tag: body.tag || 'bel-jaime'
  });

  const results = await Promise.allSettled(subscriptions.map(subscription =>
    webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth }
    }, payload, { TTL: 300, urgency: 'high' })
  ));

  const delivered = results.filter(result => result.status === 'fulfilled').length;
  return json(200, { ok: true, delivered, total: subscriptions.length });
};

export const config = { path: '/api/send-push' };

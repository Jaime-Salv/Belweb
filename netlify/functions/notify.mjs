export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const target = body?.target;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const jaimeChatId = process.env.JAIME_TELEGRAM_CHAT_ID;
    const belChatId = process.env.BEL_TELEGRAM_CHAT_ID;

    if (!botToken || !jaimeChatId || !belChatId) {
      return new Response(
        JSON.stringify({ error: "Notificaciones todavía no configuradas." }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    let chatId;
    let text;

    if (target === "jaime") {
      chatId = jaimeChatId;
      text = "🚨❤️ BEL NECESITA ASISTENCIA MIMAL\n\nSe solicita presencia inmediata de Jaime para mimos, abrazos y atención prioritaria.";
    } else if (target === "bel") {
      chatId = belChatId;
      text = "🚨❤️ JAIME NECESITA ASISTENCIA MIMAL\n\nBel ha sido requerida para una intervención urgente de cariño.";
    } else {
      return new Response(JSON.stringify({ error: "Destino no válido." }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
        }),
      }
    );

    if (!telegramResponse.ok) {
      const detail = await telegramResponse.text();
      console.error("Telegram error:", detail);
      return new Response(JSON.stringify({ error: "No se pudo enviar el aviso." }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Error interno." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

export const config = {
  path: "/api/asistencia",
};

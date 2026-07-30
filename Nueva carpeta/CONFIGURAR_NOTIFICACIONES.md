# Activar "Asistencia Mimal" con Telegram

La web ya está preparada. Faltan solo 3 variables secretas en Netlify:

- TELEGRAM_BOT_TOKEN
- JAIME_TELEGRAM_CHAT_ID
- BEL_TELEGRAM_CHAT_ID

## 1. Crear el bot
En Telegram, abre una conversación con @BotFather.
Usa `/newbot`, elige nombre y usuario y guarda el token que te proporciona.

IMPORTANTE: no pongas ese token dentro de config.js ni de ningún archivo del repositorio.

## 2. Jaime y Bel deben iniciar conversación con el bot
Cada uno abre el bot recién creado y pulsa Start / Iniciar.

Telegram no deja que un bot escriba a una persona que nunca haya iniciado la conversación.

## 3. Obtener los dos chat_id
Después de que ambos hayan escrito al bot, abre en el navegador:

https://api.telegram.org/botTU_TOKEN/getUpdates

Busca los bloques `"chat"` y su `"id"` para cada conversación.
Anota cuál corresponde a Jaime y cuál a Bel.

## 4. Guardarlos en Netlify
En el proyecto de Netlify:
Project configuration → Environment variables

Crea:
TELEGRAM_BOT_TOKEN = token de BotFather
JAIME_TELEGRAM_CHAT_ID = id de Jaime
BEL_TELEGRAM_CHAT_ID = id de Bel

Después haz un nuevo deploy para que las variables estén disponibles.

## 5. Resultado
La web principal:
Botón "Necesito asistencia" → notifica a Jaime.

Tu página:
https://TU-WEB.netlify.app/jaime.html
Botón "Avisar a Bel" → notifica a Bel.

Puedes guardar `jaime.html` como acceso directo en la pantalla de inicio del móvil.

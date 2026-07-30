# Bel & Jaime ❤️

Esta versión convierte el proyecto en un pequeño espacio privado de pareja.

## Incluye ahora
- Emergencias mimosas.
- Cartas "Ábreme cuando".
- Cápsulas del tiempo.
- Próximos viajes.
- Sitios donde queréis comer.
- Línea temporal.
- Página privada de Jaime para avisar a Bel.
- Función de Telegram ya preparada.

## IMPORTANTE sobre las cápsulas
En esta versión, las cápsulas nuevas se guardan en `localStorage` para probar la experiencia sin montar todavía la base de datos.

Eso significa:
- Funcionan en el mismo navegador/dispositivo.
- No se sincronizan todavía entre Bel y Jaime.
- No es seguridad real frente a una persona técnica.

Para la versión definitiva compartida hay un archivo:
`SUPABASE_SCHEMA.sql`

La arquitectura recomendada es:
1. Login privado de Bel y Jaime con Supabase Auth.
2. Cápsulas guardadas en Supabase.
3. El destinatario ve metadatos pero NO recibe el contenido antes de `open_at`.
4. Al llegar la fecha, una función segura devuelve el mensaje.
5. Telegram avisa de que la cápsula ya puede abrirse.

## Siguiente paso técnico recomendado
Conectar esta interfaz a vuestro proyecto Supabase y crear los dos usuarios privados.

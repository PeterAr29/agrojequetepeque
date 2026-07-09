@AGENTS.md

# Contexto del proyecto

AgroJequetepeque — plataforma de gestión agrícola (Next.js 16 + Supabase + Tailwind v4).
Lee **@docs/CONTEXTO.md** para el contexto completo (qué es, arquitectura, modelo de datos,
estado y próximos pasos).

## Reglas rápidas
- Dominio en **español** (tablas, variables y UI).
- Seguridad de datos por **RLS** en Supabase (`supabase/schema.sql`), no en el frontend.
- Cada tabla lleva `usuario_id = auth.uid()`; incluirlo siempre en los `insert`.
- Páginas con estado/hooks → `"use client"`.
- Mantener el estilo visual verde con tarjetas redondeadas (ver módulos existentes).

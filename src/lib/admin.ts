// ============================================================
//  Administradores del sistema
// ------------------------------------------------------------
//  Lista de correos con permisos de administrador. Sirve para
//  mostrar herramientas internas (p. ej. el botón "Probar
//  notificación") solo a estas cuentas, no a los agricultores.
//
//  Se puede configurar sin tocar código con la variable de entorno
//  NEXT_PUBLIC_ADMIN_EMAILS (correos separados por coma) en Vercel.
//  Si no se define, se usa el correo por defecto de abajo.
// ============================================================

const POR_DEFECTO = "pedroarce989@gmail.com";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || POR_DEFECTO)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** ¿El correo dado pertenece a un administrador? */
export function esAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

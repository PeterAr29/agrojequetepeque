/**
 * Gestión del tema (claro / oscuro / sistema).
 * El tema efectivo se aplica como atributo `data-theme` en <html>,
 * y globals.css remapea la paleta neutra cuando vale "oscuro".
 */
export type Tema = "claro" | "oscuro" | "sistema";

const CLAVE = "tema";

export function temaGuardado(): Tema {
  if (typeof window === "undefined") return "sistema";
  const t = localStorage.getItem(CLAVE);
  return t === "claro" || t === "oscuro" || t === "sistema" ? t : "sistema";
}

/** Convierte la preferencia en el tema real a pintar. */
export function resolverTema(t: Tema): "claro" | "oscuro" {
  if (t === "sistema") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "oscuro"
      : "claro";
  }
  return t;
}

export function aplicarTema(t: Tema) {
  document.documentElement.setAttribute("data-theme", resolverTema(t));
}

// Store mínimo para que la UI (useSyncExternalStore) reaccione al cambio de tema.
const suscriptores = new Set<() => void>();

export function suscribirCambioTema(cb: () => void): () => void {
  suscriptores.add(cb);
  return () => suscriptores.delete(cb);
}

export function guardarTema(t: Tema) {
  localStorage.setItem(CLAVE, t);
  aplicarTema(t);
  suscriptores.forEach((cb) => cb());
}

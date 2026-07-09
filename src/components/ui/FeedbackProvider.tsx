"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

// ============================================================
//  Sistema de feedback: toasts + diálogo de confirmación.
//  Reemplaza a alert() y confirm() con una UI consistente.
//
//  Uso:
//    const toast = useToast();
//    toast.success("Guardado");
//    toast.error("Algo salió mal");
//
//    const confirmar = useConfirm();
//    if (await confirmar({ mensaje: "¿Eliminar?" })) { ... }
// ============================================================

type ToastTipo = "success" | "error" | "info";

type Toast = {
  id: number;
  tipo: ToastTipo;
  mensaje: string;
};

type ConfirmOpciones = {
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligro?: boolean;
};

type ConfirmState = ConfirmOpciones & {
  abierto: boolean;
  resolver?: (valor: boolean) => void;
};

type ToastApi = {
  success: (mensaje: string) => void;
  error: (mensaje: string) => void;
  info: (mensaje: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const ConfirmContext = createContext<
  ((opciones: ConfirmOpciones) => Promise<boolean>) | null
>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de FeedbackProvider");
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de FeedbackProvider");
  return ctx;
}

const ICONOS: Record<ToastTipo, string> = {
  success: "✅",
  error: "⛔",
  info: "ℹ️",
};

const ESTILOS: Record<ToastTipo, string> = {
  success: "border-green-500 bg-white",
  error: "border-red-500 bg-white",
  info: "border-blue-500 bg-white",
};

export default function FeedbackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    abierto: false,
    mensaje: "",
  });
  const idRef = useRef(0);

  const quitarToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const agregarToast = useCallback(
    (tipo: ToastTipo, mensaje: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, tipo, mensaje }]);
      setTimeout(() => quitarToast(id), 4000);
    },
    [quitarToast]
  );

  const toastApi = useMemo<ToastApi>(
    () => ({
      success: (m) => agregarToast("success", m),
      error: (m) => agregarToast("error", m),
      info: (m) => agregarToast("info", m),
    }),
    [agregarToast]
  );

  const confirmar = useCallback((opciones: ConfirmOpciones) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...opciones, abierto: true, resolver: resolve });
    });
  }, []);

  const cerrarConfirm = (valor: boolean) => {
    confirmState.resolver?.(valor);
    setConfirmState({ abierto: false, mensaje: "" });
  };

  return (
    <ToastContext.Provider value={toastApi}>
      <ConfirmContext.Provider value={confirmar}>
        {children}

        {/* CONTENEDOR DE TOASTS */}
        <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3 w-[calc(100%-2.5rem)] max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="alert"
              className={`flex items-start gap-3 rounded-xl border-l-4 shadow-lg p-4 animate-[slideIn_0.2s_ease-out] ${ESTILOS[t.tipo]}`}
            >
              <span className="text-xl leading-none">{ICONOS[t.tipo]}</span>
              <p className="flex-1 text-slate-700 text-sm">{t.mensaje}</p>
              <button
                onClick={() => quitarToast(t.id)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* DIÁLOGO DE CONFIRMACIÓN */}
        {confirmState.abierto && (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
            onClick={() => cerrarConfirm(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {confirmState.titulo || "Confirmar acción"}
              </h3>
              <p className="text-slate-600 mb-6">{confirmState.mensaje}</p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => cerrarConfirm(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  {confirmState.textoCancelar || "Cancelar"}
                </button>
                <button
                  onClick={() => cerrarConfirm(true)}
                  className={`px-5 py-2.5 rounded-xl text-white font-medium ${
                    confirmState.peligro
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {confirmState.textoConfirmar || "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Palette, User, Lock, Mail, CalendarDays, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/FeedbackProvider";
import ToggleTema from "@/components/ui/ToggleTema";
import Skeleton from "@/components/ui/Skeleton";

function formatoFecha(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default function ConfiguracionPage() {
  const toast = useToast();

  const [cargando, setCargando] = useState(true);
  const [email, setEmail] = useState("");
  const [creado, setCreado] = useState<string | null>(null);
  const [ultimoAcceso, setUltimoAcceso] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  const [nuevaClave, setNuevaClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [guardandoClave, setGuardandoClave] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        setNombre((user.user_metadata?.nombre as string) || "");
        setCreado(user.created_at ?? null);
        setUltimoAcceso(user.last_sign_in_at ?? null);
      }
      setCargando(false);
    };
    cargar();
  }, []);

  async function guardarPerfil() {
    setGuardandoPerfil(true);
    const { error } = await supabase.auth.updateUser({
      data: { nombre: nombre.trim() },
    });
    setGuardandoPerfil(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Perfil actualizado");
  }

  async function cambiarClave() {
    if (nuevaClave.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (nuevaClave !== confirmarClave) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setGuardandoClave(true);
    const { error } = await supabase.auth.updateUser({ password: nuevaClave });
    setGuardandoClave(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNuevaClave("");
    setConfirmarClave("");
    toast.success("Contraseña actualizada");
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-green-700">
            Configuración
          </h1>
          <p className="text-slate-600 mt-2">
            Personaliza tu cuenta y la apariencia de la aplicación.
          </p>
        </div>

        {/* APARIENCIA */}
        <section className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-3 rounded-2xl">
              <Palette className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Apariencia</h2>
              <p className="text-slate-500 text-sm">
                Elige el tema. &laquo;Sistema&raquo; sigue la preferencia de tu
                dispositivo.
              </p>
            </div>
          </div>
          <ToggleTema />
        </section>

        {/* PERFIL */}
        <section className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-100 p-3 rounded-2xl">
              <User className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Perfil</h2>
              <p className="text-slate-500 text-sm">Tus datos de cuenta.</p>
            </div>
          </div>

          {cargando ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-2/3" />
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block mb-2 text-sm font-medium text-slate-600">
                  Nombre para mostrar
                </label>
                <input
                  className="w-full border border-slate-300 rounded-xl"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <Dato
                  Icono={Mail}
                  etiqueta="Correo"
                  valor={email}
                />
                <Dato
                  Icono={CalendarDays}
                  etiqueta="Miembro desde"
                  valor={formatoFecha(creado)}
                />
                <Dato
                  Icono={Clock}
                  etiqueta="Último acceso"
                  valor={formatoFecha(ultimoAcceso)}
                />
              </div>

              <button
                onClick={guardarPerfil}
                disabled={guardandoPerfil}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-6 py-3 rounded-xl shadow-lg active:scale-95 transition"
              >
                {guardandoPerfil ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          )}
        </section>

        {/* CUENTA / CONTRASEÑA */}
        <section className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-100 p-3 rounded-2xl">
              <Lock className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Contraseña</h2>
              <p className="text-slate-500 text-sm">
                Cambia tu contraseña de acceso.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                type="password"
                className="w-full border border-slate-300 rounded-xl"
                placeholder="Nueva contraseña"
                value={nuevaClave}
                onChange={(e) => setNuevaClave(e.target.value)}
              />
              <input
                type="password"
                className="w-full border border-slate-300 rounded-xl"
                placeholder="Repetir contraseña"
                value={confirmarClave}
                onChange={(e) => setConfirmarClave(e.target.value)}
              />
            </div>
            <button
              onClick={cambiarClave}
              disabled={guardandoClave}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-6 py-3 rounded-xl shadow-lg active:scale-95 transition"
            >
              {guardandoClave ? "Actualizando…" : "Actualizar contraseña"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Dato({
  Icono,
  etiqueta,
  valor,
}: {
  Icono: React.ComponentType<{ className?: string }>;
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
        <Icono className="w-4 h-4" />
        {etiqueta}
      </div>
      <p className="text-slate-800 text-sm font-medium break-words">{valor}</p>
    </div>
  );
}

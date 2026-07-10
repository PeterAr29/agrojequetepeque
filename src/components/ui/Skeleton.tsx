/**
 * Bloque gris con animación de pulso para estados de carga.
 * Uso: <Skeleton className="h-8 w-24" />
 */
export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
      aria-hidden
    />
  );
}

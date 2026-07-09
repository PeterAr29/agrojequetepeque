import { redirect } from "next/navigation";

export default function Home() {
  // La app arranca en el dashboard; AuthGuard redirige a /login si no hay sesión.
  redirect("/dashboard");
}

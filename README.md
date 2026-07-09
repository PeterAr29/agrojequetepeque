# 🌱 AgroJequetepeque

Plataforma web para la **gestión agrícola** del valle de Jequetepeque: parcelas, cultivos,
riegos, producción, gastos e ingresos — todo en un solo lugar.

Construido con **Next.js 16 + React 19 + TypeScript + Tailwind CSS v4** y **Supabase**
(PostgreSQL + Auth + Row Level Security).

> 📖 Para entender el proyecto en profundidad, lee **[`docs/CONTEXTO.md`](docs/CONTEXTO.md)**.

---

## 🚀 Puesta en marcha (local)

### 1. Requisitos
- Node.js 18.18+ (recomendado 20+)
- Una cuenta gratuita en [Supabase](https://supabase.com)

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Supabase
1. Crea un proyecto en Supabase.
2. Ve a **SQL Editor**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y
   pulsa **Run**. Esto crea las tablas, índices y políticas de seguridad (RLS).
3. En **Project Settings → API**, copia el *Project URL* y la *anon/publishable key*.

### 4. Variables de entorno
```bash
cp .env.example .env.local
```
Rellena `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
```

### 5. Ejecutar
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000).

---

## ☁️ Despliegue en Vercel

1. Sube el proyecto a un repositorio de **GitHub**.
2. En [vercel.com](https://vercel.com/new) → **Add New Project** → importa el repo.
3. **Root Directory**: `agrojequetepeque` (si el repo contiene la carpeta padre `Proyectos`).
4. Añade las **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Pulsa **Deploy**.
6. En **Supabase → Authentication → URL Configuration**:
   - *Site URL*: `https://tu-app.vercel.app`
   - *Redirect URLs*: añade `https://tu-app.vercel.app/update-password`

   (Necesario para que los correos de confirmación y de recuperación de contraseña
   redirijan correctamente en producción.)

---

## 📂 Scripts

| Comando          | Descripción                        |
|------------------|------------------------------------|
| `npm run dev`    | Servidor de desarrollo             |
| `npm run build`  | Build de producción                |
| `npm run start`  | Ejecuta el build de producción     |
| `npm run lint`   | Linter (ESLint)                    |

---

## 🗂️ Módulos

| Módulo       | Ruta                     | Estado |
|--------------|--------------------------|--------|
| Dashboard    | `/dashboard`             | ✅     |
| Parcelas     | `/dashboard/parcelas`    | ✅     |
| Cultivos     | `/dashboard/cultivos`    | ✅     |
| Riegos       | `/dashboard/riegos`      | ✅     |
| Producción   | `/dashboard/produccion`  | ✅     |
| Gastos       | `/dashboard/gastos`      | ✅     |
| Ingresos     | `/dashboard/ingresos`    | ✅     |

---

## 🔒 Seguridad

La clave `NEXT_PUBLIC_SUPABASE_ANON_KEY` es **pública** por diseño. El aislamiento de datos
entre usuarios lo garantiza **Row Level Security** en la base de datos (ver `schema.sql`).
Nunca coloques la `service_role key` en el frontend.

---

## 📄 Licencia

Proyecto privado — AgroJequetepeque.

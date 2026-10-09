# Revisión diaria de ciclomotores

Suministros Médicos Andaluces SA. Web (Vue 3 + Supabase) para registrar la **entrada** (checklist del ciclomotor) y la **salida** (incidencias) de cada servicio.

| Ruta | Uso |
|---|---|
| `/#/entrada` | QR 1: el conductor elige su nombre, escribe la matrícula y marca Bien/Mal en cada elemento. |
| `/#/salida` | QR 2: el conductor registra el fin del servicio y reporta incidencias. |
| `/#/admin` | Solo contraseña. Lista de registros, filtros (conductor, matrícula, tipo, mes) y PDF mensual. |

La hora se guarda automáticamente al enviar; no se pide al usuario.

## Puesta en marcha
1. Crea un proyecto gratuito en [Supabase](https://supabase.com).
2. Ejecuta `supabase/schema.sql` en *SQL Editor*.
3. En *Authentication > Users* crea el usuario administrador (correo + contraseña). Desactiva el registro público en *Authentication > Providers > Email > Allow new users to sign up*.
4. Copia `.env.example` a `.env` y rellénalo (URL, clave `anon`, correo del admin).
5. `npm install && npm run dev`.

## Despliegue en GitHub Pages
- *Settings > Pages > Source: GitHub Actions*.
- *Settings > Secrets and variables > Actions*: añade `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_EMAIL`.
- Al hacer push a `main` se publica. Los QR apuntan a `https://<usuario>.github.io/<repo>/#/entrada` y `.../#/salida`.

## Personalizar
Conductores y elementos del checklist: `src/lib/config.js`.

## Seguridad
Con la política RLS de `schema.sql`, cualquiera con el enlace puede **crear** registros, pero solo el administrador autenticado puede **leerlos**.

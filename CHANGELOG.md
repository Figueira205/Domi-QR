# Registro de cambios

Todos los cambios relevantes del proyecto se documentan en este archivo.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [1.0.0] - 2026-10-09

### Añadido
- Formularios de **entrada** y **salida** accesibles por QR, con identificación mediante **PIN único de 4 dígitos**.
- Checklist de 11 elementos con selección de moto, registro de incidencias y aviso cuando afectan a la seguridad.
- **Panel de administración** con acceso por contraseña, filtros por empleado, tipo, moto y mes.
- **Hoja mensual en PDF** por empleado con el formato oficial: ✓/✗ por día y elemento, firmas de inicio y fin de turno con el nombre completo y matrícula de la moto.
- **Gestión de empleados** (crear, modificar, eliminar) sin PIN repetidos.
- **Alta de registros pasados** por el administrador.
- Base de datos en Supabase con *Row Level Security* y funciones `verificar_pin` y `registrar`.
- Despliegue automático en GitHub Pages mediante GitHub Actions.

# Registro de cambios

Todos los cambios relevantes del proyecto se documentan en este archivo.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [1.3.0] - 2026-10-09

### Añadido
- Al **modificar o añadir un registro** desde el panel, ahora se puede elegir también la **hora**, además del día de trabajo. Una salida a una hora hasta la 1:30 se guarda en la madrugada siguiente, pero cuenta para el día elegido.
- El administrador **cumple la norma de la salida**: no puede registrar una salida sin una entrada ese día, y la salida toma automáticamente la moto de la entrada.
- No se puede eliminar una entrada que tiene salida ese día, ni mover una entrada dejando sin entrada a su salida.
- Restricción en la base de datos (disparador `registros_salida_con_entrada`) que exige la entrada y fija la moto de la salida, aunque se intente saltar el panel.
- Restricción única por empleado, tipo y día (`registros_unico_por_dia`) aplicada en la base de datos.

## [1.2.0] - 2026-10-09

### Añadido
- **La salida solo se puede registrar si ese día hay una entrada** del empleado. Si no la hay, la aplicación lo indica y ofrece ir a registrarla.
- **La salida usa siempre la moto de la entrada** (el empleado ya no la elige). Si la entrada se sustituye por otra moto, la salida de ese día se actualiza.
- En el panel de administración, las salidas con entrada ese día quedan fijadas a la moto de la entrada.
- Función `entrada_del_turno`, que indica al formulario de salida la entrada y la moto del turno.

## [1.1.0] - 2026-10-09

### Añadido
- El administrador puede **modificar y eliminar cualquier registro** desde el panel (al tocar un registro). El borrado pide confirmación y es permanente.
- **Un registro de entrada y uno de salida por empleado y día**, tanto para empleados como para el administrador.
- **Aviso antes de sustituir:** si ya existe la entrada o la salida de ese día, se pregunta si se quiere sustituir por la nueva.
- **Turnos de madrugada:** las salidas hasta la 1:30 (hora de Madrid) cuentan para el día anterior. La hora real se conserva y se indica en el panel.
- Columna `dia` (día de trabajo) en los registros; el panel y la hoja PDF la usan para filtrar y colocar cada registro.

### Cambiado
- La función de registro de los empleados pasa a llamarse `registrar_turno` e incluye las reglas anteriores.

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

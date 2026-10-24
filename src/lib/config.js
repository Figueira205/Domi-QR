export const EMPRESA = 'SUMINISTROS MÉDICOS ANDALUCES SA'

// Matrículas de reserva: se usan solo si no se puede leer la lista de motos de la base de datos.
// La lista real la gestiona el administrador desde el panel (pestaña Motos).
export const MOTOS = ['6610LTS', '6601LTS']

// Elementos del checklist (mismo orden que el papel).
export const ELEMENTOS = [
  { key: 'neumaticos', label: 'Neumáticos', ayuda: 'Presión, desgaste, cortes o deformaciones' },
  { key: 'frenos', label: 'Frenos', ayuda: 'Funcionamiento y respuesta adecuada' },
  { key: 'direccion', label: 'Dirección', ayuda: 'Ausencia de holguras o anomalías' },
  { key: 'luces', label: 'Luces e intermitentes', ayuda: 'Funcionamiento correcto' },
  { key: 'espejos', label: 'Espejos retrovisores', ayuda: 'Colocación, estado y visibilidad' },
  { key: 'claxon', label: 'Claxon', ayuda: 'Funcionamiento' },
  { key: 'acelerador', label: 'Acelerador', ayuda: 'Respuesta y retorno correcto' },
  { key: 'combustible', label: 'Combustible / batería', etiquetaHoja: 'Combustible/Batería', ayuda: 'Suficiente para el servicio' },
  { key: 'caballete', label: 'Caballete', ayuda: 'Funcionamiento y estabilidad' },
  { key: 'baul', label: 'Baúl / sistema de carga', etiquetaHoja: 'Baúl/Sistema de carga', ayuda: 'Cerrado y sujeto, sin riesgo de desprendimiento' },
  { key: 'estado_general', label: 'Estado general', ayuda: 'Sin daños o averías visibles que afecten a la conducción' },
]

import { supabase } from './supabase.js'

// 'YYYY-MM' -> ['YYYY-MM-01', 'YYYY-MM-01 del mes siguiente'] (para filtrar por día de trabajo)
export function rangoMesDia(mes) {
  const [a, m] = mes.split('-').map(Number)
  const sig = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`
  return [`${mes}-01`, `${sig}-01`]
}

// 'YYYY-MM-DD' -> '09/10/2026'
export const fechaCorta = (dia) => dia.split('-').reverse().join('/')

// Hora local (HH:MM) de un instante ISO
export const horaLocal = (iso) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

// ¿Ese instante cae en un día natural distinto del día de trabajo? (salidas de madrugada)
export const esDiaSiguiente = (iso, dia) => {
  const d = new Date(iso)
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return local !== dia
}

// Instante real de un registro dado su día de trabajo y su hora ('HH:MM').
// Las salidas hasta la 1:30 pertenecen al día anterior: su hora real es de madrugada, ya en el día natural siguiente.
export const instanteDeDia = (dia, tipo, hora) => {
  const [a, m, d] = dia.split('-').map(Number)
  const [hh, mm] = (hora || (tipo === 'entrada' ? '09:00' : '17:00')).split(':').map(Number)
  const madrugada = tipo === 'salida' && (hh < 1 || (hh === 1 && mm <= 30))
  return new Date(a, m - 1, d + (madrugada ? 1 : 0), hh, mm).toISOString()
}

// Hora local ('HH:MM') de un instante ISO, para los campos de hora
export const horaDeInstante = (iso) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Hora por defecto al crear un registro a mano
export const horaPorDefecto = (tipo) => (tipo === 'entrada' ? '09:00' : '17:00')

// Devuelve el registro que ya existe para ese empleado, tipo y día (o null)
export async function registroExistente({ empleadoId, tipo, dia, exceptoId = null }) {
  let q = supabase.from('registros').select('id, created_at').eq('empleado_id', empleadoId).eq('tipo', tipo).eq('dia', dia).limit(1)
  if (exceptoId) q = q.neq('id', exceptoId)
  const { data, error } = await q
  if (error) throw error
  return data[0] ?? null
}

// Moto de la entrada de ese empleado ese día (o null si no hay entrada)
export async function entradaDelDia({ empleadoId, dia }) {
  const { data, error } = await supabase
    .from('registros')
    .select('matricula')
    .eq('empleado_id', empleadoId)
    .eq('tipo', 'entrada')
    .eq('dia', dia)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data[0] ?? null
}

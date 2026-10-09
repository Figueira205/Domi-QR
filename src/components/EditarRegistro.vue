<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ELEMENTOS, MOTOS } from '../lib/config'
import { supabase } from '../lib/supabase'
import { instanteDeDia, registroExistente, fechaCorta, entradaDelDia, horaDeInstante } from '../lib/dias'

const props = defineProps({
  registro: { type: Object, required: true },
  empleados: { type: Array, required: true },
})
const emit = defineEmits(['guardado', 'cancelar'])

const r = props.registro
const hoy = new Date()
const fechaMax = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

const empleadoId = ref(r.empleado_id ?? '')
const dia = ref(r.dia)
const hora = ref(horaDeInstante(r.created_at))
const horaInicial = hora.value
const sinEntrada = ref(false) // en una salida: ese empleado no tiene entrada ese día
const matricula = ref(r.matricula)
const checks = reactive(Object.fromEntries(ELEMENTOS.map((e) => [e.key, r.checks?.[e.key] ?? true])))
const incidencia = ref(r.incidencia ?? '')
const afecta = ref(Boolean(r.afecta_seguridad))
const actuacion = ref(r.actuacion ?? '')
const guardando = ref(false)
const motoEntrada = ref(null) // en una salida: la moto de la entrada de ese día
const error = ref('')

const motos = computed(() => (MOTOS.includes(matricula.value) ? MOTOS : [matricula.value, ...MOTOS]))
const esEntrada = r.tipo === 'entrada'
const hayMal = computed(() => esEntrada && Object.values(checks).some((v) => v === false))
// Una salida debe llevar la moto de la entrada de ese mismo día
async function buscarMotoEntrada() {
  motoEntrada.value = null
  sinEntrada.value = false
  if (r.tipo !== 'salida' || !empleadoId.value || !dia.value) return
  try {
    const e = await entradaDelDia({ empleadoId: empleadoId.value, dia: dia.value })
    motoEntrada.value = e?.matricula ?? null
    sinEntrada.value = !e
    if (e) matricula.value = e.matricula
  } catch {
    motoEntrada.value = null
  }
}
onMounted(buscarMotoEntrada)
watch([empleadoId, dia], buscarMotoEntrada)

const valido = computed(
  () => empleadoId.value && dia.value && hora.value && matricula.value && !sinEntrada.value && (!hayMal.value || incidencia.value.trim()),
)

async function guardar() {
  error.value = ''
  guardando.value = true
  const emp = props.empleados.find((e) => e.id === empleadoId.value)
  try {
    if (r.tipo === 'salida') {
      const entrada = await entradaDelDia({ empleadoId: emp.id, dia: dia.value })
      if (!entrada) {
        error.value = `${emp.nombre} no tiene entrada el ${fechaCorta(dia.value)}. Una salida necesita una entrada ese día.`
        guardando.value = false
        return
      }
      matricula.value = entrada.matricula
    } else if ((emp.id !== r.empleado_id || dia.value !== r.dia) && r.empleado_id) {
      // Si se mueve una entrada, no puede dejar sin entrada a la salida de su día
      const salida = await registroExistente({ empleadoId: r.empleado_id, tipo: 'salida', dia: r.dia })
      if (salida) {
        error.value = `Esta entrada tiene una salida el ${fechaCorta(r.dia)}. Mueve o elimina primero esa salida.`
        guardando.value = false
        return
      }
    }
    if (await registroExistente({ empleadoId: emp.id, tipo: r.tipo, dia: dia.value, exceptoId: r.id })) {
      error.value = `${emp.nombre} ya tiene una ${r.tipo} el ${fechaCorta(dia.value)}. Elige otro día u otro empleado.`
      guardando.value = false
      return
    }
  } catch {
    error.value = 'No se pudo comprobar si ya existe un registro ese día.'
    guardando.value = false
    return
  }
  const cambios = {
    empleado_id: emp.id,
    conductor: emp.nombre,
    matricula: matricula.value,
    dia: dia.value,
    checks: esEntrada ? { ...checks } : null,
    incidencia: incidencia.value.trim() || null,
    afecta_seguridad: incidencia.value.trim() ? afecta.value : false,
    actuacion: actuacion.value.trim() || null,
  }
  if (dia.value !== r.dia || hora.value !== horaInicial) cambios.created_at = instanteDeDia(dia.value, r.tipo, hora.value)
  const { error: err } = await supabase.from('registros').update(cambios).eq('id', r.id)
  if (err) { guardando.value = false; error.value = 'No se pudo guardar los cambios.'; return }
  // Si se cambia la moto de una entrada, la salida de ese día pasa a llevar la misma
  if (esEntrada) {
    await supabase.from('registros').update({ matricula: matricula.value })
      .eq('empleado_id', emp.id).eq('tipo', 'salida').eq('dia', dia.value)
  }
  guardando.value = false
  emit('guardado')
}
</script>

<template>
  <form class="card" style="border-color:var(--rojo)" @submit.prevent="guardar" @click.stop>
    <h2>Modificar {{ r.tipo }}</h2>
    <div class="grid2">
      <div>
        <label>Empleado</label>
        <select v-model="empleadoId" required>
          <option v-if="!r.empleado_id" value="" disabled>{{ r.conductor }} (eliminado)</option>
          <option v-for="e in empleados" :key="e.id" :value="e.id">{{ e.nombre }}</option>
        </select>
      </div>
      <div>
        <label>Día de trabajo</label>
        <input v-model="dia" type="date" :max="fechaMax" required />
      </div>
      <div>
        <label>Hora</label>
        <input v-model="hora" type="time" required />
      </div>
    </div>
    <small v-if="r.tipo === 'salida'">Las salidas hasta la 1:30 de la madrugada cuentan para el día de trabajo anterior.</small>
    <p v-if="sinEntrada" class="error">Ese empleado no tiene entrada ese día. Una salida necesita una entrada.</p>
    <label>Ciclomotor</label>
    <select v-model="matricula" required :disabled="Boolean(motoEntrada)">
      <option v-for="m in motos" :key="m">{{ m }}</option>
    </select>
    <small v-if="motoEntrada">La salida usa la moto de la entrada de ese día. Para cambiarla, modifica la entrada.</small>

    <template v-if="esEntrada">
      <label>Estado de la moto</label>
      <div v-for="e in ELEMENTOS" :key="e.key" class="item">
        <div class="nombre">{{ e.label }}</div>
        <div class="toggle">
          <button type="button" class="bien" :class="{ on: checks[e.key] === true }" @click="checks[e.key] = true">Bien</button>
          <button type="button" class="mal" :class="{ on: checks[e.key] === false }" @click="checks[e.key] = false">Mal</button>
        </div>
      </div>
    </template>

    <label>Incidencia{{ hayMal ? ' (obligatoria si algo está mal)' : ' (opcional)' }}</label>
    <textarea v-model="incidencia" />
    <label v-if="incidencia.trim()"><input v-model="afecta" type="checkbox" style="width:auto" /> Afecta a la seguridad</label>
    <label>Actuación realizada (opcional)</label>
    <textarea v-model="actuacion" />

    <p v-if="error" class="error">{{ error }}</p>
    <div class="grid2" style="margin-top:.8rem">
      <button type="button" class="sec" @click="emit('cancelar')">Cancelar</button>
      <button :disabled="!valido || guardando">{{ guardando ? 'Guardando…' : 'Guardar cambios' }}</button>
    </div>
  </form>
</template>

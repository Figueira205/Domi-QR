<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ELEMENTOS, MOTOS } from '../lib/config'
import { supabase } from '../lib/supabase'
import { instanteDeDia, registroExistente, fechaCorta, entradaDelDia, horaPorDefecto } from '../lib/dias'

const props = defineProps({ empleados: { type: Array, required: true } })
const emit = defineEmits(['guardado'])

const hoy = new Date()
const fechaMax = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

const empleadoId = ref('')
const fecha = ref('')
const tipo = ref('entrada')
const hora = ref(horaPorDefecto('entrada'))
const sinEntrada = ref(false) // en una salida: ese empleado no tiene entrada ese día
const matricula = ref('')
const motoEntrada = ref(null) // moto de la entrada de ese día, si ya existe (la salida debe usarla)
const checks = reactive(Object.fromEntries(ELEMENTOS.map((e) => [e.key, true])))
const incidencia = ref('')
const afecta = ref(false)
const guardando = ref(false)
const error = ref('')
const ok = ref('')

const hayMal = computed(() => tipo.value === 'entrada' && Object.values(checks).some((v) => v === false))
const matriculaLimpia = computed(() => matricula.value.toUpperCase().replace(/\s+/g, ' ').trim())
const valido = computed(
  () =>
    empleadoId.value &&
    fecha.value &&
    hora.value &&
    matriculaLimpia.value.length >= 3 &&
    !sinEntrada.value &&
    (!hayMal.value || incidencia.value.trim()),
)

watch(tipo, (t) => (hora.value = horaPorDefecto(t)))

// La salida lleva la moto de la entrada de ese día
watch([empleadoId, fecha, tipo], async () => {
  motoEntrada.value = null
  sinEntrada.value = false
  if (tipo.value !== 'salida' || !empleadoId.value || !fecha.value) return
  try {
    const e = await entradaDelDia({ empleadoId: empleadoId.value, dia: fecha.value })
    motoEntrada.value = e?.matricula ?? null
    sinEntrada.value = !e
    if (e) matricula.value = e.matricula
  } catch {
    motoEntrada.value = null
  }
})

async function guardar() {
  error.value = ''
  ok.value = ''
  guardando.value = true
  const emp = props.empleados.find((e) => e.id === empleadoId.value)
  try {
    if (tipo.value === 'salida') {
      const entrada = await entradaDelDia({ empleadoId: emp.id, dia: fecha.value })
      if (!entrada) {
        error.value = `${emp.nombre} no tiene entrada el ${fechaCorta(fecha.value)}. Registra primero la entrada para poder registrar la salida.`
        guardando.value = false
        return
      }
      matricula.value = entrada.matricula
    }
    if (await registroExistente({ empleadoId: emp.id, tipo: tipo.value, dia: fecha.value })) {
      error.value = `${emp.nombre} ya tiene una ${tipo.value} el ${fechaCorta(fecha.value)}. Modifica ese registro desde la lista en vez de crear otro.`
      guardando.value = false
      return
    }
  } catch {
    error.value = 'No se pudo comprobar si ya existe un registro ese día.'
    guardando.value = false
    return
  }
  const fila = {
    tipo: tipo.value,
    conductor: emp.nombre,
    empleado_id: emp.id,
    matricula: matriculaLimpia.value,
    dia: fecha.value,
    created_at: instanteDeDia(fecha.value, tipo.value, hora.value),
    checks: tipo.value === 'entrada' ? { ...checks } : null,
    incidencia: incidencia.value.trim() || null,
    afecta_seguridad: incidencia.value.trim() ? afecta.value : false,
  }
  const { error: err } = await supabase.from('registros').insert(fila)
  guardando.value = false
  if (err) { error.value = 'No se pudo guardar el registro.'; return }
  ok.value = `Registro de ${tipo.value} añadido (${emp.nombre}, ${fechaCorta(fecha.value)}).`
  incidencia.value = ''
  afecta.value = false
  ELEMENTOS.forEach((e) => (checks[e.key] = true))
  emit('guardado')
}
</script>

<template>
  <details class="card">
    <summary><strong>Añadir un registro pasado</strong></summary>
    <p><small>Para días en los que un empleado olvidó fichar. Aparecerá en la hoja del mes.</small></p>
    <form @submit.prevent="guardar">
      <div class="grid2">
        <div>
          <label>Empleado</label>
          <select v-model="empleadoId" required>
            <option value="" disabled>Selecciona</option>
            <option v-for="e in empleados" :key="e.id" :value="e.id">{{ e.nombre }}</option>
          </select>
        </div>
        <div>
          <label>Registro</label>
          <select v-model="tipo">
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
        </div>
        <div>
          <label>Día de trabajo</label>
          <input v-model="fecha" type="date" :max="fechaMax" required />
        </div>
        <div>
          <label>Hora</label>
          <input v-model="hora" type="time" required />
        </div>
      </div>
      <label>Ciclomotor</label>
      <select v-model="matricula" required :disabled="Boolean(motoEntrada)">
        <option value="" disabled>Selecciona</option>
        <option v-for="m in MOTOS" :key="m">{{ m }}</option>
      </select>

      <p v-if="tipo === 'salida' && motoEntrada"><small>La salida usa la moto de la entrada de ese día ({{ motoEntrada }}).</small></p>
      <p v-else-if="tipo === 'salida' && sinEntrada" class="error">Ese empleado no tiene entrada ese día. Registra primero la entrada para poder registrar la salida.</p>
      <p v-if="tipo === 'salida'"><small>Las salidas hasta la 1:30 de la madrugada cuentan para el día de trabajo anterior.</small></p>

      <template v-if="tipo === 'entrada'">
        <label>Estado de la moto ese día</label>
        <div v-for="e in ELEMENTOS" :key="e.key" class="item">
          <div class="nombre">{{ e.label }}</div>
          <div class="toggle">
            <button type="button" class="bien" :class="{ on: checks[e.key] === true }" @click="checks[e.key] = true">Bien</button>
            <button type="button" class="mal" :class="{ on: checks[e.key] === false }" @click="checks[e.key] = false">Mal</button>
          </div>
        </div>
      </template>

      <label>Incidencia (opcional{{ hayMal ? ', obligatoria si algo está mal' : '' }})</label>
      <textarea v-model="incidencia" />
      <label v-if="incidencia.trim()"><input v-model="afecta" type="checkbox" style="width:auto" /> Afecta a la seguridad</label>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="ok" style="color:var(--ok);font-weight:600">{{ ok }}</p>
      <button class="full" style="margin-top:.8rem" :disabled="!valido || guardando">{{ guardando ? 'Guardando…' : 'Añadir registro' }}</button>
    </form>
  </details>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ELEMENTOS, MOTOS } from '../lib/config'
import { supabase } from '../lib/supabase'

const props = defineProps({ empleados: { type: Array, required: true } })
const emit = defineEmits(['guardado'])

const hoy = new Date()
const fechaMax = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

const empleadoId = ref('')
const fecha = ref('')
const tipo = ref('entrada')
const matricula = ref('')
const checks = reactive(Object.fromEntries(ELEMENTOS.map((e) => [e.key, true])))
const incidencia = ref('')
const afecta = ref(false)
const guardando = ref(false)
const error = ref('')
const ok = ref('')

const hayMal = computed(() => tipo.value === 'entrada' && Object.values(checks).some((v) => v === false))
const matriculaLimpia = computed(() => matricula.value.toUpperCase().replace(/\s+/g, ' ').trim())
const valido = computed(
  () => empleadoId.value && fecha.value && matriculaLimpia.value.length >= 3 && (!hayMal.value || incidencia.value.trim()),
)

async function guardar() {
  error.value = ''
  ok.value = ''
  guardando.value = true
  const [a, m, d] = fecha.value.split('-').map(Number)
  const hora = tipo.value === 'entrada' ? 9 : 17
  const emp = props.empleados.find((e) => e.id === empleadoId.value)
  const fila = {
    tipo: tipo.value,
    conductor: emp.nombre,
    empleado_id: emp.id,
    matricula: matriculaLimpia.value,
    created_at: new Date(a, m - 1, d, hora, 0).toISOString(),
    checks: tipo.value === 'entrada' ? { ...checks } : null,
    incidencia: incidencia.value.trim() || null,
    afecta_seguridad: incidencia.value.trim() ? afecta.value : false,
  }
  const { error: err } = await supabase.from('registros').insert(fila)
  guardando.value = false
  if (err) { error.value = 'No se pudo guardar el registro.'; return }
  ok.value = `Registro de ${tipo.value} añadido (${emp.nombre}, ${fecha.value}).`
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
          <label>Fecha</label>
          <input v-model="fecha" type="date" :max="fechaMax" required />
        </div>
        <div>
          <label>Registro</label>
          <select v-model="tipo">
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
        </div>
        <div>
          <label>Ciclomotor</label>
          <select v-model="matricula" required>
            <option value="" disabled>Selecciona</option>
            <option v-for="m in MOTOS" :key="m">{{ m }}</option>
          </select>
        </div>
      </div>

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

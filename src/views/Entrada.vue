<script setup>
import { computed, reactive, ref } from 'vue'
import { ELEMENTOS, MOTOS } from '../lib/config'
import PinGate from '../components/PinGate.vue'
import { supabase, configurado } from '../lib/supabase'

const empleado = ref(null)
const pin = ref('')
const matricula = ref('')
const checks = reactive(Object.fromEntries(ELEMENTOS.map((e) => [e.key, null])))
const incidencia = ref('')
const afecta = ref(null)
const enviando = ref(false)
const error = ref('')
const enviado = ref(false)

const hayMal = computed(() => Object.values(checks).some((v) => v === false))
const sinResponder = computed(() => Object.values(checks).filter((v) => v === null).length)
const matriculaLimpia = computed(() => matricula.value.toUpperCase().replace(/\s+/g, ' ').trim())
const valido = computed(
  () =>
    empleado.value &&
    matriculaLimpia.value.length >= 3 &&
    sinResponder.value === 0 &&
    (!hayMal.value || (incidencia.value.trim() && afecta.value !== null)),
)

function identificado(datos) {
  empleado.value = datos.empleado
  pin.value = datos.pin
}

function cambiarEmpleado() {
  empleado.value = null
  pin.value = ''
}

async function enviar() {
  error.value = ''
  if (!configurado) { error.value = 'La base de datos no está configurada.'; return }
  enviando.value = true
  const { error: err } = await supabase.rpc('registrar', {
    p_pin: pin.value,
    p_empleado: empleado.value.id,
    p_tipo: 'entrada',
    p_matricula: matriculaLimpia.value,
    p_checks: { ...checks },
    p_incidencia: hayMal.value ? incidencia.value.trim() : null,
    p_afecta: hayMal.value ? afecta.value : false,
    p_actuacion: null,
  })
  enviando.value = false
  if (err) {
    if (err.code === '28000') { error.value = 'Tu PIN ya no es válido. Vuelve a identificarte.'; cambiarEmpleado() }
    else error.value = 'No se pudo enviar. Inténtalo de nuevo.'
  } else enviado.value = true
}
</script>

<template>
  <h1>Entrada · Revisión previa al servicio</h1>

  <div v-if="enviado" class="exito">
    ✔ Revisión registrada. {{ afecta ? 'Recuerda: NO uses el ciclomotor y avisa al encargado de turno.' : 'Buen servicio.' }}
  </div>

  <PinGate v-else-if="!empleado" @listo="identificado" />

  <form v-else @submit.prevent="enviar">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
        <strong>Hola, {{ empleado.nombre }}</strong>
        <button type="button" class="sec" style="padding:.4rem .8rem" @click="cambiarEmpleado">Cambiar</button>
      </div>
      <label for="m">Ciclomotor (matrícula)</label>
      <select id="m" v-model="matricula" required>
        <option value="" disabled>Selecciona la moto</option>
        <option v-for="m in MOTOS" :key="m">{{ m }}</option>
      </select>
    </div>

    <div class="card">
      <h2>Estado del ciclomotor</h2>
      <div v-for="e in ELEMENTOS" :key="e.key" class="item">
        <div class="nombre">{{ e.label }}<small>{{ e.ayuda }}</small></div>
        <div class="toggle">
          <button type="button" class="bien" :class="{ on: checks[e.key] === true }" @click="checks[e.key] = true">Bien</button>
          <button type="button" class="mal" :class="{ on: checks[e.key] === false }" @click="checks[e.key] = false">Mal</button>
        </div>
      </div>
    </div>

    <div v-if="hayMal" class="card">
      <h2>Incidencia detectada</h2>
      <label for="i">Describe qué está mal</label>
      <textarea id="i" v-model="incidencia" required />
      <label>¿Afecta al manejo o a la seguridad?</label>
      <div class="grid2">
        <button type="button" :class="afecta === true ? '' : 'sec'" @click="afecta = true">Sí</button>
        <button type="button" :class="afecta === false ? '' : 'sec'" @click="afecta = false">No</button>
      </div>
      <div v-if="afecta" class="aviso">
        No utilices el ciclomotor hasta su comprobación y/o reparación. Comunícalo al encargado de turno antes de salir.
      </div>
    </div>

    <p v-if="sinResponder" class="error">Faltan {{ sinResponder }} elementos por marcar.</p>
    <p v-if="error" class="error">{{ error }}</p>
    <button class="full" :disabled="!valido || enviando">{{ enviando ? 'Enviando…' : 'Enviar revisión' }}</button>
  </form>
</template>

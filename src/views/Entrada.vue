<script setup>
import { computed, reactive, ref } from 'vue'
import { CONDUCTORES, ELEMENTOS, MOTOS } from '../lib/config'
import { supabase, configurado } from '../lib/supabase'

const conductor = ref('')
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
    conductor.value &&
    matriculaLimpia.value.length >= 3 &&
    sinResponder.value === 0 &&
    (!hayMal.value || (incidencia.value.trim() && afecta.value !== null)),
)

async function enviar() {
  error.value = ''
  if (!configurado) { error.value = 'La base de datos no está configurada.'; return }
  enviando.value = true
  const { error: err } = await supabase.from('registros').insert({
    tipo: 'entrada',
    conductor: conductor.value,
    matricula: matriculaLimpia.value,
    checks: { ...checks },
    incidencia: hayMal.value ? incidencia.value.trim() : null,
    afecta_seguridad: hayMal.value ? afecta.value : false,
  })
  enviando.value = false
  if (err) error.value = 'No se pudo enviar. Inténtalo de nuevo.'
  else enviado.value = true
}
</script>

<template>
  <h1>Entrada · Revisión previa al servicio</h1>

  <div v-if="enviado" class="exito">
    ✔ Revisión registrada. {{ afecta ? 'Recuerda: NO uses el ciclomotor y avisa al encargado de turno.' : 'Buen servicio.' }}
  </div>

  <form v-else @submit.prevent="enviar">
    <div class="card">
      <label for="c">Conductor</label>
      <select id="c" v-model="conductor" required>
        <option value="" disabled>Selecciona tu nombre</option>
        <option v-for="c in CONDUCTORES" :key="c">{{ c }}</option>
      </select>
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

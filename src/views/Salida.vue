<script setup>
import { computed, ref } from 'vue'
import { CONDUCTORES } from '../lib/config'
import { supabase, configurado } from '../lib/supabase'

const conductor = ref('')
const matricula = ref('')
const hayIncidencia = ref(null)
const incidencia = ref('')
const afecta = ref(null)
const actuacion = ref('')
const enviando = ref(false)
const error = ref('')
const enviado = ref(false)

const matriculaLimpia = computed(() => matricula.value.toUpperCase().replace(/\s+/g, ' ').trim())
const valido = computed(
  () =>
    conductor.value &&
    matriculaLimpia.value.length >= 3 &&
    hayIncidencia.value !== null &&
    (!hayIncidencia.value || (incidencia.value.trim() && afecta.value !== null)),
)

async function enviar() {
  error.value = ''
  if (!configurado) { error.value = 'La base de datos no está configurada.'; return }
  enviando.value = true
  const { error: err } = await supabase.from('registros').insert({
    tipo: 'salida',
    conductor: conductor.value,
    matricula: matriculaLimpia.value,
    incidencia: hayIncidencia.value ? incidencia.value.trim() : null,
    afecta_seguridad: hayIncidencia.value ? afecta.value : false,
    actuacion: hayIncidencia.value && actuacion.value.trim() ? actuacion.value.trim() : null,
  })
  enviando.value = false
  if (err) error.value = 'No se pudo enviar. Inténtalo de nuevo.'
  else enviado.value = true
}
</script>

<template>
  <h1>Salida · Fin del servicio</h1>

  <div v-if="enviado" class="exito">
    ✔ Salida registrada. {{ hayIncidencia ? 'Se ha anotado la incidencia.' : 'Gracias.' }}
  </div>

  <form v-else @submit.prevent="enviar">
    <div class="card">
      <label for="c">Conductor</label>
      <select id="c" v-model="conductor" required>
        <option value="" disabled>Selecciona tu nombre</option>
        <option v-for="c in CONDUCTORES" :key="c">{{ c }}</option>
      </select>
      <label for="m">Matrícula del ciclomotor</label>
      <input id="m" v-model="matricula" placeholder="1234 ABC" autocapitalize="characters" required />
    </div>

    <div class="card">
      <h2>¿Ha habido alguna incidencia o avería durante el servicio?</h2>
      <div class="grid2">
        <button type="button" :class="hayIncidencia === false ? '' : 'sec'" @click="hayIncidencia = false">No</button>
        <button type="button" :class="hayIncidencia === true ? '' : 'sec'" @click="hayIncidencia = true">Sí</button>
      </div>

      <template v-if="hayIncidencia">
        <label for="i">Describe la incidencia</label>
        <textarea id="i" v-model="incidencia" required />
        <label>¿Afecta al manejo o a la seguridad?</label>
        <div class="grid2">
          <button type="button" :class="afecta === true ? '' : 'sec'" @click="afecta = true">Sí</button>
          <button type="button" :class="afecta === false ? '' : 'sec'" @click="afecta = false">No</button>
        </div>
        <div v-if="afecta" class="aviso">
          El ciclomotor no debe utilizarse hasta su comprobación y/o reparación. Avisa al encargado de turno.
        </div>
        <label for="a">Actuación realizada (opcional)</label>
        <textarea id="a" v-model="actuacion" />
      </template>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <button class="full" :disabled="!valido || enviando">{{ enviando ? 'Enviando…' : 'Registrar salida' }}</button>
  </form>
</template>

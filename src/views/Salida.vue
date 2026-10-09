<script setup>
import { computed, ref } from 'vue'
import { MOTOS } from '../lib/config'
import PinGate from '../components/PinGate.vue'
import ConfirmarReemplazo from '../components/ConfirmarReemplazo.vue'
import { supabase, configurado } from '../lib/supabase'

const empleado = ref(null)
const pin = ref('')
const matricula = ref('')
const hayIncidencia = ref(null)
const incidencia = ref('')
const afecta = ref(null)
const actuacion = ref('')
const enviando = ref(false)
const error = ref('')
const enviado = ref(false)
const duplicado = ref(null) // { hora } si ya existe un registro de este tipo en el día

const matriculaLimpia = computed(() => matricula.value.toUpperCase().replace(/\s+/g, ' ').trim())
const valido = computed(
  () =>
    empleado.value &&
    matriculaLimpia.value.length >= 3 &&
    hayIncidencia.value !== null &&
    (!hayIncidencia.value || (incidencia.value.trim() && afecta.value !== null)),
)

function identificado(datos) {
  empleado.value = datos.empleado
  pin.value = datos.pin
}

function cambiarEmpleado() {
  empleado.value = null
  pin.value = ''
}

async function enviar(reemplazar = false) {
  error.value = ''
  if (!configurado) { error.value = 'La base de datos no está configurada.'; return }
  enviando.value = true
  const { error: err } = await supabase.rpc('registrar_turno', {
    p_pin: pin.value,
    p_empleado: empleado.value.id,
    p_tipo: 'salida',
    p_matricula: matriculaLimpia.value,
    p_checks: null,
    p_incidencia: hayIncidencia.value ? incidencia.value.trim() : null,
    p_afecta: hayIncidencia.value ? afecta.value : false,
    p_actuacion: hayIncidencia.value ? actuacion.value.trim() : null,
    p_reemplazar: reemplazar === true,
  })
  enviando.value = false
  if (err) {
    if (err.code === 'YA001') { duplicado.value = { hora: err.details || '' }; return }
    if (err.code === '28000') { error.value = 'Tu PIN ya no es válido. Vuelve a identificarte.'; cambiarEmpleado() }
    else error.value = 'No se pudo enviar. Inténtalo de nuevo.'
  } else {
    duplicado.value = null
    enviado.value = true
  }
}
</script>

<template>
  <h1>Salida · Fin del servicio</h1>

  <div v-if="enviado" class="exito">
    ✔ Salida registrada. {{ hayIncidencia ? 'Se ha anotado la incidencia.' : 'Gracias.' }}
  </div>

  <PinGate v-else-if="!empleado" @listo="identificado" />

  <form v-else @submit.prevent="enviar()">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
        <div>
          <small>Sesión de</small><br />
          <strong style="font-size:1.15rem">{{ empleado.nombre }}</strong>
        </div>
        <button type="button" class="sec" style="padding:.4rem .8rem" @click="cambiarEmpleado">Salir</button>
      </div>
      <label for="m">Ciclomotor (matrícula)</label>
      <select id="m" v-model="matricula" required>
        <option value="" disabled>Selecciona la moto</option>
        <option v-for="m in MOTOS" :key="m">{{ m }}</option>
      </select>
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
    <ConfirmarReemplazo
      v-if="duplicado"
      tipo="salida"
      :hora="duplicado.hora"
      :enviando="enviando"
      @confirmar="enviar(true)"
      @cancelar="duplicado = null"
    />
    <button v-else class="full" :disabled="!valido || enviando">{{ enviando ? 'Enviando…' : 'Registrar salida' }}</button>
  </form>
</template>

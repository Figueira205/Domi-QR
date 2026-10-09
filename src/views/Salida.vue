<script setup>
import { computed, ref } from 'vue'
import PinGate from '../components/PinGate.vue'
import ConfirmarReemplazo from '../components/ConfirmarReemplazo.vue'
import { supabase, configurado } from '../lib/supabase'

const empleado = ref(null)
const pin = ref('')
const entrada = ref(null) // { matricula, hora } de la entrada de este turno
const cargandoEntrada = ref(false)
const sinEntrada = ref(false)
const hayIncidencia = ref(null)
const incidencia = ref('')
const afecta = ref(null)
const actuacion = ref('')
const enviando = ref(false)
const error = ref('')
const enviado = ref(false)
const duplicado = ref(null) // { hora } si ya existe un registro de este tipo en el día

const valido = computed(
  () =>
    empleado.value &&
    entrada.value &&
    hayIncidencia.value !== null &&
    (!hayIncidencia.value || (incidencia.value.trim() && afecta.value !== null)),
)

async function identificado(datos) {
  empleado.value = datos.empleado
  pin.value = datos.pin
  entrada.value = null
  sinEntrada.value = false
  error.value = ''
  cargandoEntrada.value = true
  const { data, error: err } = await supabase.rpc('entrada_del_turno', { p_pin: pin.value, p_empleado: empleado.value.id })
  cargandoEntrada.value = false
  if (err) { error.value = 'No se pudo comprobar tu entrada. Inténtalo de nuevo.'; return }
  if (data.length) entrada.value = data[0]
  else sinEntrada.value = true
}

function cambiarEmpleado() {
  empleado.value = null
  pin.value = ''
  entrada.value = null
  sinEntrada.value = false
}

async function enviar(reemplazar = false) {
  error.value = ''
  if (!configurado) { error.value = 'La base de datos no está configurada.'; return }
  enviando.value = true
  const { error: err } = await supabase.rpc('registrar_turno', {
    p_pin: pin.value,
    p_empleado: empleado.value.id,
    p_tipo: 'salida',
    p_matricula: entrada.value.matricula,
    p_checks: null,
    p_incidencia: hayIncidencia.value ? incidencia.value.trim() : null,
    p_afecta: hayIncidencia.value ? afecta.value : false,
    p_actuacion: hayIncidencia.value ? actuacion.value.trim() : null,
    p_reemplazar: reemplazar === true,
  })
  enviando.value = false
  if (err) {
    if (err.code === 'SE001') { sinEntrada.value = true; entrada.value = null; return }
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

  <div v-else-if="sinEntrada" class="card">
    <strong>{{ empleado.nombre }}</strong>
    <div class="aviso">
      Aún no has registrado tu entrada de hoy. Para registrar la salida, primero tienes que registrar la entrada.
    </div>
    <router-link class="btn full" to="/entrada">Ir a registrar la entrada</router-link>
    <button type="button" class="sec full" style="margin-top:.6rem" @click="cambiarEmpleado">Salir</button>
  </div>

  <form v-else @submit.prevent="enviar()">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
        <div>
          <small>Sesión de</small><br />
          <strong style="font-size:1.15rem">{{ empleado.nombre }}</strong>
        </div>
        <button type="button" class="sec" style="padding:.4rem .8rem" @click="cambiarEmpleado">Salir</button>
      </div>
      <p v-if="cargandoEntrada" style="margin:.8rem 0 0">Comprobando tu entrada…</p>
      <p v-else-if="entrada" style="margin:.8rem 0 0">
        Ciclomotor: <strong>{{ entrada.matricula }}</strong><br />
        <small>El de tu entrada de hoy, registrada a las {{ entrada.hora }}.</small>
      </p>
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

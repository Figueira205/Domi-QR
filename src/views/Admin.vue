<script setup>
import { computed, onMounted, ref } from 'vue'
import { ELEMENTOS, MOTOS } from '../lib/config'
import { supabase, configurado, ADMIN_EMAIL } from '../lib/supabase'
import { generarHojaMensual } from '../lib/pdf'
import AnadirRegistro from '../components/AnadirRegistro.vue'
import Empleados from '../components/Empleados.vue'
import EditarRegistro from '../components/EditarRegistro.vue'
import { rangoMesDia, fechaCorta, horaLocal, esDiaSiguiente } from '../lib/dias'

const sesion = ref(false)
const password = ref('')
const errorLogin = ref('')
const cargando = ref(false)
const error = ref('')
const registros = ref([])
const empleados = ref([])
const seleccionado = ref(null) // id del registro con las opciones abiertas
const editandoId = ref(null)
const eliminando = ref(false)
const vista = ref('registros')

const hoy = new Date()
const filtros = ref({
  conductor: '',
  matricula: '',
  tipo: '',
  mes: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`,
})
const pdfEmpleado = ref('')
const pdfMes = ref(filtros.value.mes)
const generando = ref(false)

const labels = Object.fromEntries(ELEMENTOS.map((e) => [e.key, e.label]))
const malos = (r) => Object.entries(r.checks || {}).filter(([, v]) => v === false).map(([k]) => labels[k] || k)


async function consulta(extra = {}) {
  const f = { ...filtros.value, ...extra }
  let q = supabase.from('registros').select('*').order('dia', { ascending: false }).order('created_at', { ascending: false }).limit(2000)
  if (f.conductor) q = q.eq('empleado_id', f.conductor)
  if (f.matricula) q = q.ilike('matricula', `%${f.matricula.toUpperCase().trim()}%`)
  if (f.tipo) q = q.eq('tipo', f.tipo)
  if (f.mes) {
    const [d, h] = rangoMesDia(f.mes)
    q = q.gte('dia', d).lt('dia', h)
  }
  return q
}

async function cargar() {
  cargando.value = true
  error.value = ''
  const { data, error: err } = await consulta()
  cargando.value = false
  if (err) error.value = 'No se pudieron cargar los registros.'
  else registros.value = data
}

async function cargarEmpleados() {
  const { data, error: err } = await supabase.from('empleados').select('*').order('nombre')
  if (err) error.value = 'No se pudieron cargar los empleados.'
  else empleados.value = data
}

async function iniciar() {
  await cargarEmpleados()
  cargar()
}

async function entrar() {
  errorLogin.value = ''
  const { error: err } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: password.value })
  if (err) { errorLogin.value = 'Contraseña incorrecta.'; return }
  password.value = ''
  sesion.value = true
  iniciar()
}

async function salir() {
  await supabase.auth.signOut()
  sesion.value = false
  registros.value = []
  empleados.value = []
  vista.value = 'registros'
}

function abrirOpciones(r) {
  if (editandoId.value) return
  seleccionado.value = seleccionado.value === r.id ? null : r.id
}

function cerrarEdicion(recargar) {
  editandoId.value = null
  seleccionado.value = null
  if (recargar) cargar()
}

async function eliminar(r) {
  const ok = window.confirm(
    `¿Eliminar este registro de ${r.tipo} de ${r.conductor} (${fechaCorta(r.dia)})?\n\nSe borrará de forma permanente y no se podrá recuperar.`,
  )
  if (!ok) return
  error.value = ''
  eliminando.value = true
  const { error: err } = await supabase.from('registros').delete().eq('id', r.id)
  eliminando.value = false
  if (err) { error.value = 'No se pudo eliminar el registro.'; return }
  seleccionado.value = null
  cargar()
}

async function descargarPdf() {
  error.value = ''
  if (!pdfEmpleado.value) { error.value = 'Elige un empleado.'; return }
  generando.value = true
  const [d, h] = rangoMesDia(pdfMes.value)
  const { data, error: err } = await supabase
    .from('registros')
    .select('*')
    .eq('empleado_id', pdfEmpleado.value)
    .gte('dia', d)
    .lt('dia', h)
    .order('dia')
    .order('created_at')
    .limit(5000)
  generando.value = false
  if (err) { error.value = 'No se pudieron cargar los datos de la hoja.'; return }
  if (!data.length) { error.value = 'Ese empleado no tiene registros en ese mes.'; return }
  const emp = empleados.value.find((e) => e.id === pdfEmpleado.value)
  generarHojaMensual({ registros: data, mes: pdfMes.value, nombre: emp.nombre })
}

onMounted(async () => {
  if (!configurado) return
  const { data } = await supabase.auth.getSession()
  if (data.session) { sesion.value = true; iniciar() }
})
</script>

<template>
  <h1>Administración</h1>

  <p v-if="!configurado" class="error">La base de datos no está configurada (faltan variables VITE_SUPABASE_*).</p>

  <form v-else-if="!sesion" class="card" @submit.prevent="entrar">
    <label for="p">Contraseña</label>
    <input id="p" v-model="password" type="password" autocomplete="current-password" required />
    <p v-if="errorLogin" class="error">{{ errorLogin }}</p>
    <button class="full" style="margin-top:.8rem">Entrar</button>
  </form>

  <template v-else>
    <div class="grid2" style="margin-bottom:1rem">
      <button :class="vista === 'registros' ? '' : 'sec'" @click="vista = 'registros'">Registros</button>
      <button :class="vista === 'empleados' ? '' : 'sec'" @click="vista = 'empleados'">Empleados</button>
    </div>

    <Empleados v-if="vista === 'empleados'" :empleados="empleados" @cambio="cargarEmpleados" />

    <template v-else>
    <div class="card">
      <div class="grid2">
        <div>
          <label>Empleado</label>
          <select v-model="filtros.conductor" @change="cargar">
            <option value="">Todos</option>
            <option v-for="e in empleados" :key="e.id" :value="e.id">{{ e.nombre }}</option>
          </select>
        </div>
        <div>
          <label>Tipo</label>
          <select v-model="filtros.tipo" @change="cargar">
            <option value="">Entrada y salida</option>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
        </div>
        <div>
          <label>Moto</label>
          <select v-model="filtros.matricula" @change="cargar">
            <option value="">Todas</option>
            <option v-for="m in MOTOS" :key="m">{{ m }}</option>
          </select>
        </div>
        <div>
          <label>Mes</label>
          <input v-model="filtros.mes" type="month" @change="cargar" />
        </div>
      </div>
      <button class="sec full" style="margin-top:.8rem" @click="cargar">Actualizar</button>
    </div>

    <div class="card">
      <h2>Hoja del mes (PDF)</h2>
      <div class="grid2">
        <div>
          <label>Empleado</label>
          <select v-model="pdfEmpleado">
            <option value="" disabled>Selecciona</option>
            <option v-for="e in empleados" :key="e.id" :value="e.id">{{ e.nombre }}</option>
          </select>
        </div>
        <div>
          <label>Mes</label>
          <input v-model="pdfMes" type="month" />
        </div>
      </div>
      <p style="margin:.6rem 0"><small>Genera la hoja de revisión diaria de ese empleado, con las entradas y salidas registradas hasta hoy.</small></p>
      <button class="full" :disabled="generando" @click="descargarPdf">{{ generando ? 'Generando…' : 'Generar hoja del mes' }}</button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <AnadirRegistro :empleados="empleados" @guardado="cargar" />

    <p v-if="cargando">Cargando…</p>
    <p v-else>{{ registros.length }} registros</p>

    <template v-for="r in registros" :key="r.id">
      <EditarRegistro
        v-if="editandoId === r.id"
        :registro="r"
        :empleados="empleados"
        @guardado="cerrarEdicion(true)"
        @cancelar="cerrarEdicion(false)"
      />
      <div v-else class="card registro" :class="{ abierto: seleccionado === r.id }" @click="abrirOpciones(r)">
        <div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap">
          <strong>{{ r.conductor }} · {{ r.matricula }}</strong>
          <span>
            <span class="tag" :class="r.tipo">{{ r.tipo }}</span>
            {{ fechaCorta(r.dia) }} · {{ horaLocal(r.created_at) }}<small v-if="esDiaSiguiente(r.created_at, r.dia)"> (madrugada siguiente)</small>
          </span>
        </div>
        <p v-if="r.tipo === 'entrada'" style="margin:.5rem 0 0">
          <span v-if="malos(r).length" class="mal">Mal: {{ malos(r).join(', ') }}</span>
          <span v-else>Todo correcto</span>
        </p>
        <p v-if="r.incidencia" style="margin:.5rem 0 0">
          <span :class="{ mal: r.afecta_seguridad }">{{ r.afecta_seguridad ? '⚠ Afecta a la seguridad: ' : 'Incidencia: ' }}</span>{{ r.incidencia }}
          <span v-if="r.actuacion"><br /><em>Actuación: {{ r.actuacion }}</em></span>
        </p>
        <div v-if="seleccionado === r.id" class="grid2" style="margin-top:.8rem" @click.stop>
          <button class="sec" @click="editandoId = r.id">✏️ Modificar</button>
          <button class="sec" :disabled="eliminando" @click="eliminar(r)">🗑️ Eliminar</button>
        </div>
        <small v-else class="pista">Toca para modificar o eliminar</small>
      </div>
    </template>
    </template>

    <button class="sec full" style="margin-top:1rem" @click="salir">Cerrar sesión</button>
  </template>
</template>

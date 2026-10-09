<script setup>
import { computed, onMounted, ref } from 'vue'
import { CONDUCTORES, ELEMENTOS } from '../lib/config'
import { supabase, configurado, ADMIN_EMAIL } from '../lib/supabase'
import { generarHojaMensual } from '../lib/pdf'
import AnadirRegistro from '../components/AnadirRegistro.vue'

const sesion = ref(false)
const password = ref('')
const errorLogin = ref('')
const cargando = ref(false)
const error = ref('')
const registros = ref([])

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
const fmt = (iso) => new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
const malos = (r) => Object.entries(r.checks || {}).filter(([, v]) => v === false).map(([k]) => labels[k] || k)


function rangoMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  return [new Date(a, m - 1, 1).toISOString(), new Date(a, m, 1).toISOString()]
}

async function consulta(extra = {}) {
  const f = { ...filtros.value, ...extra }
  let q = supabase.from('registros').select('*').order('created_at', { ascending: false }).limit(2000)
  if (f.conductor) q = q.eq('conductor', f.conductor)
  if (f.matricula) q = q.ilike('matricula', `%${f.matricula.toUpperCase().trim()}%`)
  if (f.tipo) q = q.eq('tipo', f.tipo)
  if (f.mes) {
    const [d, h] = rangoMes(f.mes)
    q = q.gte('created_at', d).lt('created_at', h)
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

async function entrar() {
  errorLogin.value = ''
  const { error: err } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: password.value })
  if (err) { errorLogin.value = 'Contraseña incorrecta.'; return }
  password.value = ''
  sesion.value = true
  cargar()
}

async function salir() {
  await supabase.auth.signOut()
  sesion.value = false
  registros.value = []
}

async function descargarPdf() {
  error.value = ''
  if (!pdfEmpleado.value) { error.value = 'Elige un empleado.'; return }
  generando.value = true
  const [d, h] = rangoMes(pdfMes.value)
  const { data, error: err } = await supabase
    .from('registros')
    .select('*')
    .eq('conductor', pdfEmpleado.value)
    .gte('created_at', d)
    .lt('created_at', h)
    .order('created_at')
    .limit(5000)
  generando.value = false
  if (err) { error.value = 'No se pudieron cargar los datos de la hoja.'; return }
  if (!data.length) { error.value = 'Ese empleado no tiene registros en ese mes.'; return }
  generarHojaMensual({ registros: data, mes: pdfMes.value, conductor: pdfEmpleado.value })
}

onMounted(async () => {
  if (!configurado) return
  const { data } = await supabase.auth.getSession()
  if (data.session) { sesion.value = true; cargar() }
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
    <div class="card">
      <div class="grid2">
        <div>
          <label>Conductor</label>
          <select v-model="filtros.conductor" @change="cargar">
            <option value="">Todos</option>
            <option v-for="c in CONDUCTORES" :key="c">{{ c }}</option>
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
          <label>Matrícula</label>
          <input v-model="filtros.matricula" placeholder="1234 ABC" @change="cargar" />
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
            <option v-for="c in CONDUCTORES" :key="c">{{ c }}</option>
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

    <AnadirRegistro @guardado="cargar" />

    <p v-if="cargando">Cargando…</p>
    <p v-else>{{ registros.length }} registros</p>

    <div v-for="r in registros" :key="r.id" class="card">
      <div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap">
        <strong>{{ r.conductor }} · {{ r.matricula }}</strong>
        <span><span class="tag" :class="r.tipo">{{ r.tipo }}</span> {{ fmt(r.created_at) }}</span>
      </div>
      <p v-if="r.tipo === 'entrada'" style="margin:.5rem 0 0">
        <span v-if="malos(r).length" class="mal">Mal: {{ malos(r).join(', ') }}</span>
        <span v-else>Todo correcto</span>
      </p>
      <p v-if="r.incidencia" style="margin:.5rem 0 0">
        <span :class="{ mal: r.afecta_seguridad }">{{ r.afecta_seguridad ? '⚠ Afecta a la seguridad: ' : 'Incidencia: ' }}</span>{{ r.incidencia }}
        <span v-if="r.actuacion"><br /><em>Actuación: {{ r.actuacion }}</em></span>
      </p>
    </div>

    <button class="sec full" @click="salir">Cerrar sesión</button>
  </template>
</template>

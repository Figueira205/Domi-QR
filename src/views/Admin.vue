<script setup>
import { computed, onMounted, ref } from 'vue'
import { CONDUCTORES, ELEMENTOS } from '../lib/config'
import { supabase, configurado, ADMIN_EMAIL } from '../lib/supabase'
import { generarInformeQuincenal, rangoQuincena } from '../lib/pdf'

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
const quincena = ref(hoy.getDate() <= 15 ? 1 : 2)
const generando = ref(false)

const labels = Object.fromEntries(ELEMENTOS.map((e) => [e.key, e.label]))
const fmt = (iso) => new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
const malos = (r) => Object.entries(r.checks || {}).filter(([, v]) => v === false).map(([k]) => labels[k] || k)

const matriculaFiltro = computed(() => filtros.value.matricula.toUpperCase().replace(/\s+/g, ' ').trim())

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
  generando.value = true
  const [a, m] = filtros.value.mes.split('-').map(Number)
  const [d1, d2] = rangoQuincena(filtros.value.mes, quincena.value)
  let q = supabase
    .from('registros')
    .select('*')
    .eq('tipo', 'entrada')
    .gte('created_at', new Date(a, m - 1, d1).toISOString())
    .lt('created_at', new Date(a, m - 1, d2 + 1).toISOString())
    .order('created_at')
    .limit(5000)
  if (matriculaFiltro.value) q = q.eq('matricula', matriculaFiltro.value)
  const { data, error: err } = await q
  generando.value = false
  if (err) { error.value = 'No se pudieron cargar los datos del informe.'; return }
  const ok = generarInformeQuincenal({ registros: data, mes: filtros.value.mes, quincena: quincena.value })
  if (!ok) error.value = 'No hay registros de entrada en esa quincena.'
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
      <h2>Informe quincenal (formato oficial)</h2>
      <label>Quincena del mes seleccionado</label>
      <select v-model.number="quincena">
        <option :value="1">1ª quincena (días 1 al 15)</option>
        <option :value="2">2ª quincena (día 16 al fin de mes)</option>
      </select>
      <p style="margin:.6rem 0"><small>Usa el mes y la matrícula de los filtros. Si dejas la matrícula vacía, se genera una hoja por cada ciclomotor con registros.</small></p>
      <button class="full" :disabled="generando" @click="descargarPdf">{{ generando ? 'Generando…' : 'Generar informe quincenal' }}</button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

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

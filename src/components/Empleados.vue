<script setup>
import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({ empleados: { type: Array, required: true } })
const emit = defineEmits(['cambio'])

const nuevoNombre = ref('')
const nuevoPin = ref('')
const editando = ref(null) // id
const editNombre = ref('')
const editPin = ref('')
const error = ref('')
const ocupado = ref(false)

const soloPin = (v) => v.replace(/\D/g, '').slice(0, 4)
const pinEnUso = (pin, exceptoId) => props.empleados.some((e) => e.pin === pin && e.id !== exceptoId)

async function crear() {
  error.value = ''
  const nombre = nuevoNombre.value.trim().toUpperCase()
  if (!nombre) { error.value = 'Escribe el nombre completo.'; return }
  if (!/^\d{4}$/.test(nuevoPin.value)) { error.value = 'El PIN debe tener 4 dígitos.'; return }
  if (pinEnUso(nuevoPin.value, null)) { error.value = 'Ese PIN ya está en uso. Cada empleado necesita uno distinto.'; return }
  ocupado.value = true
  const { error: err } = await supabase.from('empleados').insert({ nombre, pin: nuevoPin.value })
  ocupado.value = false
  if (err) { error.value = err.code === '23505' ? 'Ese PIN ya está en uso. Cada empleado necesita uno distinto.' : 'No se pudo crear el empleado.'; return }
  nuevoNombre.value = ''
  nuevoPin.value = ''
  emit('cambio')
}

function editar(e) {
  editando.value = e.id
  editNombre.value = e.nombre
  editPin.value = e.pin
  error.value = ''
}

async function guardar() {
  error.value = ''
  const nombre = editNombre.value.trim().toUpperCase()
  if (!nombre) { error.value = 'Escribe el nombre completo.'; return }
  if (!/^\d{4}$/.test(editPin.value)) { error.value = 'El PIN debe tener 4 dígitos.'; return }
  if (pinEnUso(editPin.value, editando.value)) { error.value = 'Ese PIN ya está en uso. Cada empleado necesita uno distinto.'; return }
  ocupado.value = true
  const { error: err } = await supabase.from('empleados').update({ nombre, pin: editPin.value }).eq('id', editando.value)
  ocupado.value = false
  if (err) { error.value = err.code === '23505' ? 'Ese PIN ya está en uso. Cada empleado necesita uno distinto.' : 'No se pudo guardar.'; return }
  editando.value = null
  emit('cambio')
}

async function eliminar(e) {
  const ok = window.confirm(
    `¿Eliminar a ${e.nombre}?\n\nSus registros se conservan en la lista, pero ya no podrás generar su hoja del mes ni podrá fichar.`,
  )
  if (!ok) return
  error.value = ''
  const { error: err } = await supabase.from('empleados').delete().eq('id', e.id)
  if (err) { error.value = 'No se pudo eliminar.'; return }
  emit('cambio')
}
</script>

<template>
  <div class="card">
    <h2>Añadir empleado</h2>
    <label>Nombre completo</label>
    <input v-model="nuevoNombre" placeholder="NOMBRE APELLIDO" autocapitalize="characters" />
    <label>PIN (4 dígitos)</label>
    <input v-model="nuevoPin" inputmode="numeric" maxlength="4" placeholder="0000" @input="nuevoPin = soloPin(nuevoPin)" />
    <button class="full" style="margin-top:.8rem" :disabled="ocupado" @click="crear">Añadir empleado</button>
  </div>

  <p v-if="error" class="error">{{ error }}</p>

  <h2>Empleados ({{ empleados.length }})</h2>
  <div v-for="e in empleados" :key="e.id" class="card">
    <template v-if="editando === e.id">
      <label>Nombre completo</label>
      <input v-model="editNombre" autocapitalize="characters" />
      <label>PIN (4 dígitos)</label>
      <input v-model="editPin" inputmode="numeric" maxlength="4" @input="editPin = soloPin(editPin)" />
      <div class="grid2" style="margin-top:.8rem">
        <button class="sec" @click="editando = null">Cancelar</button>
        <button :disabled="ocupado" @click="guardar">Guardar</button>
      </div>
    </template>
    <template v-else>
      <div style="display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap;align-items:center">
        <div>
          <strong>{{ e.nombre }}</strong><br />
          <small>PIN: {{ e.pin }}</small>
        </div>
        <div class="grid2" style="min-width:12rem">
          <button class="sec" @click="editar(e)">Modificar</button>
          <button class="sec" @click="eliminar(e)">Eliminar</button>
        </div>
      </div>
    </template>
  </div>
</template>

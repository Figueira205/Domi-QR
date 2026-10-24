<script setup>
import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { motos, cargarMotos, normalizarMatricula } from '../lib/motos'

const nueva = ref('')
const error = ref('')
const ok = ref('')
const ocupado = ref(false)

const matricula = computed(() => normalizarMatricula(nueva.value))
const valida = computed(() => /^[A-Z0-9]{4,10}$/.test(matricula.value))

async function anadir() {
  error.value = ''
  ok.value = ''
  if (!valida.value) { error.value = 'La matrícula debe tener entre 4 y 10 letras o números.'; return }
  if (motos.value.includes(matricula.value)) { error.value = 'Esa moto ya está en la lista.'; return }
  ocupado.value = true
  const { error: err } = await supabase.from('motos').insert({ matricula: matricula.value })
  ocupado.value = false
  if (err) { error.value = err.code === '23505' ? 'Esa moto ya está en la lista.' : 'No se pudo añadir la moto.'; return }
  ok.value = `Moto ${matricula.value} añadida. Ya aparece en los formularios.`
  nueva.value = ''
  await cargarMotos()
}

async function quitar(m) {
  const confirmado = window.confirm(
    `¿Quitar la moto ${m} de la lista?\n\nDejará de aparecer en los formularios. Los registros anteriores conservan su matrícula.`,
  )
  if (!confirmado) return
  error.value = ''
  ok.value = ''
  const { error: err } = await supabase.from('motos').delete().eq('matricula', m)
  if (err) { error.value = 'No se pudo quitar la moto.'; return }
  await cargarMotos()
}
</script>

<template>
  <div class="card">
    <h2>Añadir moto</h2>
    <label>Matrícula</label>
    <input v-model="nueva" placeholder="1234ABC" autocapitalize="characters" @keyup.enter="anadir" />
    <small v-if="nueva && matricula !== nueva">Se guardará como <strong>{{ matricula }}</strong> (sin espacios ni guiones).</small>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="ok" style="color:var(--ok);font-weight:600">{{ ok }}</p>
    <button class="full" style="margin-top:.8rem" :disabled="ocupado || !nueva" @click="anadir">Añadir moto</button>
  </div>

  <h2>Motos ({{ motos.length }})</h2>
  <div v-for="m in motos" :key="m" class="card" style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
    <strong style="font-size:1.1rem">{{ m }}</strong>
    <button class="sec" @click="quitar(m)">Quitar</button>
  </div>
  <p v-if="!motos.length"><small>No hay motos. Añade la primera para que los empleados puedan registrar su entrada.</small></p>
</template>

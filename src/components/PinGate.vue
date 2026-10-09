<script setup>
import { ref } from 'vue'
import { supabase, configurado } from '../lib/supabase'

const emit = defineEmits(['listo'])

const pin = ref('')
const error = ref('')
const cargando = ref(false)

function soloNumeros() {
  pin.value = pin.value.replace(/\D/g, '').slice(0, 4)
  if (pin.value.length === 4) comprobar()
}

async function comprobar() {
  if (cargando.value || pin.value.length !== 4) return
  error.value = ''
  if (!configurado) { error.value = 'La base de datos no está configurada.'; return }
  cargando.value = true
  const { data, error: err } = await supabase.rpc('verificar_pin', { p_pin: pin.value })
  cargando.value = false
  if (err) { error.value = 'No se pudo comprobar el PIN. Inténtalo de nuevo.'; return }
  if (!data.length) { error.value = 'PIN incorrecto.'; pin.value = ''; return }
  emit('listo', { empleado: data[0], pin: pin.value }) // el PIN es único: identifica a una sola persona
}
</script>

<template>
  <div class="card">
    <h2>Introduce tu PIN</h2>
    <input
      v-model="pin"
      type="password"
      inputmode="numeric"
      autocomplete="off"
      maxlength="4"
      placeholder="••••"
      style="font-size:2rem;text-align:center;letter-spacing:.5rem"
      @input="soloNumeros"
      @keyup.enter="comprobar"
    />
    <p v-if="error" class="error">{{ error }}</p>
    <button class="full" style="margin-top:.8rem" :disabled="pin.length !== 4 || cargando" @click="comprobar">
      {{ cargando ? 'Comprobando…' : 'Entrar' }}
    </button>
  </div>
</template>

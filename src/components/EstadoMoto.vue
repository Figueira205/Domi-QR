<script setup>
import { ELEMENTOS } from '../lib/config'

// `checks` es un objeto reactivo { elemento: true | false | null }.
// Con `opcional`, tocar de nuevo el botón activo quita la marca.
const props = defineProps({
  checks: { type: Object, required: true },
  opcional: { type: Boolean, default: false },
})

function marcar(key, valor) {
  props.checks[key] = props.opcional && props.checks[key] === valor ? null : valor
}
</script>

<template>
  <div>
    <div v-for="e in ELEMENTOS" :key="e.key" class="item">
      <div class="nombre">{{ e.label }}</div>
      <div class="toggle">
        <button type="button" class="bien" :class="{ on: checks[e.key] === true }" @click="marcar(e.key, true)">Bien</button>
        <button type="button" class="mal" :class="{ on: checks[e.key] === false }" @click="marcar(e.key, false)">Mal</button>
      </div>
    </div>
  </div>
</template>

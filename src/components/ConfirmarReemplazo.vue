<script setup>
defineProps({
  tipo: { type: String, required: true }, // 'entrada' | 'salida'
  hora: { type: String, required: true },
  enviando: { type: Boolean, default: false },
})
defineEmits(['confirmar', 'cancelar'])
</script>

<template>
  <div class="aviso">
    <p style="margin:0 0 .6rem">
      {{ tipo === 'entrada'
        ? `Ya registraste tu entrada de hoy (a las ${hora}).`
        : `Ya registraste tu salida de este día de trabajo (a las ${hora}).` }}
    </p>
    <p style="margin:0 0 .8rem">
      ¿Quieres sustituirla por {{ tipo === 'entrada' ? 'esta nueva entrada' : 'esta nueva salida' }} ahora mismo?
    </p>
    <div class="grid2">
      <button type="button" class="sec" :disabled="enviando" @click="$emit('cancelar')">No, cancelar</button>
      <button type="button" :disabled="enviando" @click="$emit('confirmar')">{{ enviando ? 'Guardando…' : 'Sí, sustituirla' }}</button>
    </div>
  </div>
</template>

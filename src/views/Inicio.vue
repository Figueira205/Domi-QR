<template>
  <h1>Revisión de ciclomotores</h1>
  <div class="card">
    <h2>Entrada</h2>
    <p>Al empezar el servicio: revisa la moto y registra su estado.</p>
    <router-link class="btn full" to="/entrada">Ir a Entrada</router-link>
  </div>
  <div class="card">
    <h2>Salida</h2>
    <p>Al terminar el servicio: registra la salida y reporta incidencias.</p>
    <router-link class="btn full" to="/salida">Ir a Salida</router-link>
  </div>
  <p><router-link to="/admin">Administración</router-link></p>
</template>

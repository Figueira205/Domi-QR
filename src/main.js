import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Inicio from './views/Inicio.vue'
import Entrada from './views/Entrada.vue'
import Salida from './views/Salida.vue'
import Admin from './views/Admin.vue'
import './style.css'

// Hash routing: /#/entrada, /#/salida, /#/admin (compatible con GitHub Pages)
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Inicio },
    { path: '/entrada', component: Entrada },
    { path: '/salida', component: Salida },
    { path: '/admin', component: Admin },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

createApp(App).use(router).mount('#app')

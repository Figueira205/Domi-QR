import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base relativa: funciona en GitHub Pages sin importar el nombre del repositorio
export default defineConfig({
  base: './',
  plugins: [vue()],
})

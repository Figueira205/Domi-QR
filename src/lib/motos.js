import { ref } from 'vue'
import { supabase, configurado } from './supabase.js'
import { MOTOS as MOTOS_POR_DEFECTO } from './config.js'

// Lista de matrículas compartida por toda la aplicación. Se carga de la base de datos;
// si no se puede cargar, se usa la lista por defecto de config.js.
export const motos = ref([...MOTOS_POR_DEFECTO])

export async function cargarMotos() {
  if (!configurado) return
  const { data, error } = await supabase.from('motos').select('matricula').order('matricula')
  if (!error) motos.value = data.map((m) => m.matricula)
}

// "6610 lts" / "6610-LTS" -> "6610LTS"
export const normalizarMatricula = (texto) => texto.toUpperCase().replace(/[^A-Z0-9]/g, '')

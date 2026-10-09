import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configurado = Boolean(url && key)
export const supabase = configurado ? createClient(url, key) : null
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

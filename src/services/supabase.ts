import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants'; // <--- Alat untuk baca app.config.js
import 'react-native-url-polyfill/auto'; // <--- WAJIB ADA (Obat Network Error)

// 1. Ambil kunci dari "Extra" yang sudah kamu set di app.config.js
// Gunakan ?. (optional chaining) jaga-jaga kalau null
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

// 2. Cek apakah kunci berhasil diambil (Untuk debugging di terminal)
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("⚠️  BAHAYA: Supabase URL/Key tidak ditemukan di Config!");
    console.error("Pastikan kamu sudah jalankan: eas update");
}

// 3. Buat Client
export const supabase = createClient(
    supabaseUrl || "",
    supabaseAnonKey || "",
    {
        auth: {
            persistSession: true, // Agar user tidak logout saat tutup aplikasi
            detectSessionInUrl: false,
        },
    }
);
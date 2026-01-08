import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Ganti dengan data asli project Supabase Anda!
const SUPABASE_URL = 'https://tbrdoygkaxqwennbrmxt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicmRveWdrYXhxd2VubmJybXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NzQyMDUsImV4cCI6MjA4MzM1MDIwNX0.xiBjMLYkNFiZ2yZsEbuO-6sbhK-cGxS4DZ7K7hizHj4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
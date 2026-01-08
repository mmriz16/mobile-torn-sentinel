import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // 1. Inisialisasi Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Ambil API Key Torn (Nanti kita set di Secrets)
    const tornKey = Deno.env.get('TORN_API_KEY');
    if (!tornKey) throw new Error("TORN_API_KEY belum disetting!");

    console.log("🔄 Sedang mengambil data item dari Torn API...");

    // 3. Request ke Torn
    const response = await fetch(`https://api.torn.com/torn/?selections=items&key=${tornKey}`);
    const data = await response.json();

    if (data.error) throw new Error(`Torn API Error: ${data.error.error}`);

    const itemsMap = data.items; // Object besar dari Torn
    const itemIds = Object.keys(itemsMap);

    console.log(`📦 Ditemukan ${itemIds.length} item. Memulai proses penyimpanan...`);

    // 4. Transformasi Data (Mapping JSON Torn -> Tabel Supabase)
    const formattedItems = itemIds.map((id) => {
      const item = itemsMap[id];

      // Kita susun objek 'stats' agar rapi di dalam JSONB
      const statsObject = {
        effect: item.effect || null,
        requirement: item.requirement || null,

        // Data Coverage (Penting untuk Armor)
        coverage: item.coverage || null,

        // Placeholder untuk battle stats (Damage/Accuracy) 
        // kalau nanti API Torn update atau kita input manual
        damage: item.damage || 0,
        accuracy: item.accuracy || 0,
        fire_rate: item.rate_of_fire || 0
      };

      return {
        id: Number(id),
        name: item.name,
        description: item.description,
        type: item.type,
        weapon_type: item.weapon_type || null,
        buy_price: item.buy_price,
        sell_price: item.sell_price,
        market_value: item.market_value,
        circulation: item.circulation,
        image_url: item.image,
        stats: statsObject, // Masukkan ke kolom JSONB
        updated_at: new Date()
      };
    });

    // 5. Batch Insert (Supabase punya limit payload, kita pecah per 500 item)
    const BATCH_SIZE = 500;
    for (let i = 0; i < formattedItems.length; i += BATCH_SIZE) {
      const chunk = formattedItems.slice(i, i + BATCH_SIZE);

      const { error } = await supabaseAdmin
        .from('items')
        .upsert(chunk, { onConflict: 'id' }); // Update jika ID ada, Insert jika belum

      if (error) {
        console.error(`❌ Gagal batch ${i}:`, error);
      } else {
        console.log(`✅ Batch item ${i} sampai ${i + chunk.length} tersimpan.`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Berhasil sinkronisasi ${itemIds.length} item.`
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
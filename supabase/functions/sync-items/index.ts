import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Country code mapping for display names
const COUNTRY_NAMES: Record<string, string> = {
  mex: 'Mexico',
  cay: 'Cayman Islands',
  can: 'Canada',
  haw: 'Hawaii',
  uni: 'United Kingdom',
  arg: 'Argentina',
  swi: 'Switzerland',
  jap: 'Japan',
  chi: 'China',
  uae: 'UAE',
  sou: 'South Africa'
};

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

    console.log("🔄 Sedang mengambil data item dari Torn API dan YATA...");

    // 3. Request ke Torn API dan YATA API secara paralel
    const [tornResponse, yataResponse] = await Promise.all([
      fetch(`https://api.torn.com/torn/?selections=items&key=${tornKey}`),
      fetch('https://yata.yt/api/v1/travel/export/')
    ]);

    const tornData = await tornResponse.json();
    const yataData = await yataResponse.json();

    if (tornData.error) throw new Error(`Torn API Error: ${tornData.error.error}`);

    const itemsMap = tornData.items;
    const itemIds = Object.keys(itemsMap);

    console.log(`📦 Ditemukan ${itemIds.length} item dari Torn API.`);

    // 4. Ambil harga lama dari items table untuk tracking price changes
    // & Filter HOT ITEMS only (Database gak perlu load 1000 item. Hemat memory.)
    const { data: hotItems } = await supabaseAdmin
      .from('items')
      .select('id, current_price')
      .eq('is_hot_item', true);

    if (!hotItems || hotItems.length === 0) {
      console.log("⚠️ Tidak ada item yang ditandai sebagai HOT ITEM. Skip sync.");
      return new Response(JSON.stringify({
        success: true,
        message: "Tidak ada hot items untuk disinkronisasi."
      }), { headers: { "Content-Type": "application/json" } });
    }

    console.log(`🔥 Mengambil ${hotItems.length} hot items untuk diproses.`);

    // Buat map untuk lookup cepat & filter
    const hotItemsMap = new Map<number, number>();
    const hotItemIds = new Set<number>();

    for (const item of hotItems) {
      hotItemsMap.set(item.id, item.current_price || 0);
      hotItemIds.add(item.id);
    }

    // 5. Transformasi Data Torn -> Tabel items (HANYA HOT ITEMS)
    // Filter dulu ID yang ada di hotItemIds
    const formattedItems = itemIds
      .filter(id => hotItemIds.has(Number(id)))
      .map((id) => {
        const item = itemsMap[id];
        const itemId = Number(id);
        const currentPrice = item.market_value || 0;
        const lastPrice = hotItemsMap.get(itemId) || null;

        // Hitung persentase perubahan harga
        let priceChangePercent = 0;
        if (lastPrice && lastPrice > 0) {
          priceChangePercent = ((currentPrice - lastPrice) / lastPrice) * 100;
          priceChangePercent = Math.round(priceChangePercent * 100) / 100;
        }

        return {
          id: itemId,
          name: item.name,
          description: item.description,
          type: item.type,
          weapon_type: item.weapon_type || null,
          buy_price: item.buy_price || 0,
          sell_price: item.sell_price || 0,
          market_value: item.market_value || 0,
          circulation: item.circulation || 0,
          image_url: item.image || null,
          updated_at: new Date().toISOString(),
          damage: item.damage || 0,
          accuracy: item.accuracy || 0,
          fire_rate: item.rate_of_fire || 0,
          effect: item.effect || null,
          coverage: item.coverage ? JSON.stringify(item.coverage) : null,
          requirement: item.requirement || null,
          // Price tracking fields
          current_price: currentPrice,
          last_price: lastPrice,
          price_change_percent: priceChangePercent
        };
      });

    // 6. Batch Insert items ke Supabase
    const BATCH_SIZE = 500;
    for (let i = 0; i < formattedItems.length; i += BATCH_SIZE) {
      const chunk = formattedItems.slice(i, i + BATCH_SIZE);

      const { error } = await supabaseAdmin
        .from('items')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.error(`❌ Gagal batch items ${i}:`, error);
      } else {
        console.log(`✅ Batch item ${i} sampai ${i + chunk.length} tersimpan.`);
      }
    }

    // 7. Proses Foreign Market Data dari YATA (simplified - only current price)
    console.log("🌍 Memproses data Foreign Market dari YATA...");

    const foreignStocks: {
      item_id: number;
      country_code: string;
      country_name: string;
      quantity: number;
      price: number;
      updated_at: string;
    }[] = [];

    if (yataData.stocks) {
      for (const [countryCode, countryData] of Object.entries(yataData.stocks)) {
        const country = countryData as { update: number; stocks: { id: number; name: string; quantity: number; cost: number }[] };

        if (country.stocks && Array.isArray(country.stocks)) {
          for (const stock of country.stocks) {
            foreignStocks.push({
              item_id: stock.id,
              country_code: countryCode,
              country_name: COUNTRY_NAMES[countryCode] || countryCode.toUpperCase(),
              quantity: stock.quantity,
              price: stock.cost,
              updated_at: new Date(country.update * 1000).toISOString()
            });
          }
        }
      }
    }

    console.log(`🌍 Ditemukan ${foreignStocks.length} foreign stock entries.`);

    // 8. Upsert foreign stocks ke Supabase
    if (foreignStocks.length > 0) {
      for (let i = 0; i < foreignStocks.length; i += BATCH_SIZE) {
        const chunk = foreignStocks.slice(i, i + BATCH_SIZE);

        const { error } = await supabaseAdmin
          .from('item_foreign_stocks')
          .upsert(chunk, { onConflict: 'item_id,country_code' });

        if (error) {
          console.error(`❌ Gagal batch foreign stocks ${i}:`, error);
        } else {
          console.log(`✅ Batch foreign stocks ${i} sampai ${i + chunk.length} tersimpan.`);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Berhasil sinkronisasi ${itemIds.length} items dan ${foreignStocks.length} foreign stocks.`,
      updated_at: new Date().toISOString()
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error("❌ Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    console.log('🚀 Starting update-stocks function');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const TORN_KEY = Deno.env.get('TORN_API_KEY');
    console.log('🔑 TORN_API_KEY exists:', !!TORN_KEY);

    // 1. Ambil Data dari Torn
    const tornRes = await fetch(`https://api.torn.com/torn/?selections=stocks&key=${TORN_KEY}`);
    const tornJson = await tornRes.json();
    console.log('📊 Torn API response received, has stocks:', !!tornJson.stocks);

    if (tornJson.error) {
      console.error('❌ Torn API error:', tornJson.error);
      throw new Error(tornJson.error.error);
    }

    const stocksMap = tornJson.stocks;
    const timestamp = new Date().toISOString();

    const refUpdates = [];
    const historyInserts = [];

    // 2. Loop Data
    for (const [stockIdStr, data] of Object.entries(stocksMap)) {
      const stockId = parseInt(stockIdStr);
      const stockData = data as any;

      // Siapkan data untuk Table REFERENSI (Master)
      refUpdates.push({
        stock_id: stockId,
        name: stockData.name,
        acronym: stockData.acronym,
        current_price: stockData.current_price,
        market_cap: stockData.market_cap,
        total_shares: stockData.total_shares,
        investors: stockData.investors,
        benefit_type: stockData.benefit?.type || null,
        benefit_frequency: stockData.benefit?.frequency || null,
        benefit_requirement: stockData.benefit?.requirement || null,
        benefit_description: stockData.benefit?.description || null,
        updated_at: timestamp
      });

      // Siapkan data untuk Table HISTORY (Time Series)
      historyInserts.push({
        stock_id: stockId,
        price: stockData.current_price,
        market_cap: stockData.market_cap,
        total_shares: stockData.total_shares,
        investors: stockData.investors,
        created_at: timestamp
      });
    }

    console.log('📝 Prepared records - refs:', refUpdates.length, 'history:', historyInserts.length);

    // 3. EKSEKUSI DATABASE
    if (refUpdates.length > 0) {
      // Step A: Update/Create Master Data dulu (PENTING! Biar FK gak error)
      console.log('💾 Upserting stocks_ref...');
      const { error: refError } = await supabase
        .from('stocks_ref')
        .upsert(refUpdates, { onConflict: 'stock_id' });

      if (refError) {
        console.error('❌ stocks_ref error:', refError);
        throw refError;
      }
      console.log('✅ stocks_ref upserted successfully');

      // Step B: Baru insert History
      console.log('💾 Inserting stock_history...');
      const { error: histError } = await supabase
        .from('stock_history')
        .insert(historyInserts);

      if (histError) {
        console.error('❌ stock_history error:', histError);
        throw histError;
      }
      console.log('✅ stock_history inserted successfully');
    }

    console.log('🎉 Function completed successfully');
    return new Response(JSON.stringify({
      success: true,
      updated_refs: refUpdates.length,
      inserted_history: historyInserts.length
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
})
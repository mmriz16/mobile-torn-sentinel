import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuration
const BATCH_SIZE = 50; // Items per invocation (to stay within API rate limits)
const HOT_ITEMS_PRIORITY = true; // Always process hot items first

interface ItemToSync {
    id: number;
    name: string;
    current_price: number;
    is_hot_item: boolean;
}

interface BazaarListing {
    price: number;
    quantity: number;
}

serve(async (_req) => {
    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const tornKey = Deno.env.get('TORN_API_KEY');
        if (!tornKey) throw new Error("TORN_API_KEY belum disetting!");

        console.log("🔄 Starting bazaar price sync...");

        // 1. Get items to sync - prioritize hot items, then oldest synced
        const { data: itemsToSync, error: fetchError } = await supabaseAdmin
            .from('items')
            .select('id, name, current_price, is_hot_item')
            .order('is_hot_item', { ascending: false }) // Hot items first
            .order('last_bazaar_sync', { ascending: true, nullsFirst: true }) // Oldest sync first
            .limit(BATCH_SIZE);

        if (fetchError) {
            console.error("❌ DB Error:", fetchError);
            return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
        }

        if (!itemsToSync || itemsToSync.length === 0) {
            console.log("⚠️ No items to sync");
            return new Response(JSON.stringify({ success: true, message: "No items to sync" }));
        }

        const hotCount = itemsToSync.filter(i => i.is_hot_item).length;
        console.log(`📦 Processing ${itemsToSync.length} items (${hotCount} hot items)`);

        // 2. Fetch bazaar prices for each item
        let successCount = 0;
        let priceChanges = 0;
        const updates: {
            id: number;
            lowest_bazaar_price: number;
            current_price: number;
            last_price: number;
            price_change_percent: number;
            last_bazaar_sync: string;
        }[] = [];

        for (const item of itemsToSync as ItemToSync[]) {
            try {
                // Fetch item market data from Torn API v2
                const response = await fetch(
                    `https://api.torn.com/v2/market/${item.id}/itemmarket?key=${tornKey}`
                );
                const data = await response.json();

                if (data.error) {
                    console.error(`  ❌ API Error for ${item.name}:`, data.error);
                    continue;
                }

                // Get lowest price from item market listings (API v2 structure)
                const listings = data.itemmarket?.listings as BazaarListing[] | undefined;
                if (!listings || listings.length === 0) {
                    // No listings - keep current price
                    updates.push({
                        id: item.id,
                        lowest_bazaar_price: 0,
                        current_price: item.current_price || 0,
                        last_price: item.current_price || 0,
                        price_change_percent: 0,
                        last_bazaar_sync: new Date().toISOString()
                    });
                    continue;
                }

                // Find lowest price
                const lowestPrice = Math.min(...listings.map(l => l.price));
                const oldPrice = item.current_price || 0;

                // Calculate price change
                let priceChangePercent = 0;
                if (oldPrice > 0 && lowestPrice !== oldPrice) {
                    priceChangePercent = ((lowestPrice - oldPrice) / oldPrice) * 100;
                    priceChangePercent = Math.round(priceChangePercent * 100) / 100;
                    priceChanges++;
                    console.log(`  💰 ${item.name}: $${oldPrice.toLocaleString()} → $${lowestPrice.toLocaleString()} (${priceChangePercent > 0 ? '+' : ''}${priceChangePercent}%)`);
                }

                updates.push({
                    id: item.id,
                    lowest_bazaar_price: lowestPrice,
                    current_price: lowestPrice,
                    last_price: oldPrice,
                    price_change_percent: priceChangePercent,
                    last_bazaar_sync: new Date().toISOString()
                });

                successCount++;

                // Small delay to be nice to API
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (err) {
                console.error(`  ❌ Error processing ${item.name}:`, err);
            }
        }

        // 3. Update database - use individual updates instead of upsert to avoid NOT NULL constraint issues
        let updateSuccessCount = 0;
        for (const update of updates) {
            const { error: updateError } = await supabaseAdmin
                .from('items')
                .update({
                    lowest_bazaar_price: update.lowest_bazaar_price,
                    current_price: update.current_price,
                    last_price: update.last_price,
                    price_change_percent: update.price_change_percent,
                    last_bazaar_sync: update.last_bazaar_sync
                })
                .eq('id', update.id);

            if (updateError) {
                console.error(`  ❌ Update Error for ID ${update.id}:`, updateError.message);
            } else {
                updateSuccessCount++;
            }
        }
        console.log(`💾 Updated ${updateSuccessCount}/${updates.length} items in database.`);

        console.log(`✅ Synced ${successCount}/${itemsToSync.length} items. ${priceChanges} price changes detected.`);

        return new Response(JSON.stringify({
            success: true,
            synced: successCount,
            priceChanges: priceChanges,
            hotItems: hotCount,
            totalProcessed: itemsToSync.length
        }), { headers: { "Content-Type": "application/json" } });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("❌ FATAL:", message);
        return new Response(JSON.stringify({ error: message }), { status: 500 });
    }
});

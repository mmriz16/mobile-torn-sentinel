// supabase/functions/check-chain-status/index.ts
// Edge function to check status of chain targets
// Runs every 30 seconds via Supabase Cron
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BATCH_SIZE = 10; // Check 10 targets per run

interface TornProfileResponse {
    error?: { code: number; error: string };
    status?: {
        state: string;
        until: number;
    };
}

interface ChainTarget {
    torn_id: number;
    name: string;
    status: string;
}

interface DecryptedUser {
    id: number;
    decrypted_key: string;
}

serve(async (_req) => {
    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log("🎯 Chain Status Checker started...");

        // Get batch of targets to check
        const { data: targets, error: targetsError } = await supabaseClient
            .rpc("get_chain_targets_to_check", { p_batch_size: BATCH_SIZE });

        if (targetsError) {
            console.error("❌ Failed to get targets:", targetsError.message);
            return new Response(JSON.stringify({ error: targetsError }), { status: 500 });
        }

        if (!targets || targets.length === 0) {
            console.log("✅ No targets to check");
            return new Response(JSON.stringify({ message: "No targets to check" }), { status: 200 });
        }

        console.log(`📊 Checking ${targets.length} targets...`);

        // Get API keys from registered users (distributed load)
        const { data: users, error: usersError } = await supabaseClient
            .rpc("get_decrypted_users");

        if (usersError || !users || users.length === 0) {
            console.error("❌ No API keys available:", usersError?.message);
            return new Response(JSON.stringify({ error: "No API keys available" }), { status: 500 });
        }

        // Filter users with valid keys
        const validUsers = (users as DecryptedUser[]).filter(u => u.decrypted_key);
        if (validUsers.length === 0) {
            console.error("❌ No valid API keys found");
            return new Response(JSON.stringify({ error: "No valid API keys" }), { status: 500 });
        }

        let checkedCount = 0;
        let hospitalCount = 0;
        let okayCount = 0;
        let errorCount = 0;

        // Process each target with staggered API calls
        for (const target of targets as ChainTarget[]) {
            try {
                // Select random API key for load distribution
                const randomUser = validUsers[Math.floor(Math.random() * validUsers.length)];
                const apiKey = randomUser.decrypted_key;

                // Small delay between calls to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));

                // Call Torn API
                const res = await fetch(
                    `https://api.torn.com/user/${target.torn_id}?selections=profile&key=${apiKey}`
                );
                const data = (await res.json()) as TornProfileResponse;

                if (data.error) {
                    console.log(`⚠️ API error for ${target.name}: ${data.error.error}`);
                    errorCount++;
                    continue;
                }

                const status = data.status?.state ?? "Unknown";
                const statusUntil = data.status?.until ?? null;

                // Update database
                const { error: updateError } = await supabaseClient
                    .rpc("update_chain_target_status", {
                        p_torn_id: target.torn_id,
                        p_status: status,
                        p_status_until: statusUntil
                    });

                if (updateError) {
                    console.error(`❌ Failed to update ${target.name}:`, updateError.message);
                    errorCount++;
                } else {
                    checkedCount++;
                    if (status === "Hospital" || status === "Jail") {
                        hospitalCount++;
                        console.log(`🏥 ${target.name} is in ${status} until ${new Date(statusUntil * 1000).toLocaleTimeString()}`);
                    } else {
                        okayCount++;
                    }
                }
            } catch (err) {
                console.error(`❌ Error checking ${target.name}:`, err);
                errorCount++;
            }
        }

        const summary = {
            checked: checkedCount,
            hospital: hospitalCount,
            okay: okayCount,
            errors: errorCount
        };

        console.log(`✅ Done! Checked: ${checkedCount}, Hospital: ${hospitalCount}, Okay: ${okayCount}, Errors: ${errorCount}`);

        return new Response(JSON.stringify(summary), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("❌ Unexpected error:", error);
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
});

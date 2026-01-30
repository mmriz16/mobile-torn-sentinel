// supabase/functions/check-chain-status/index.ts
// Edge function to check status of chain targets
// Runs every minute via Supabase Cron
// Distributes work across all available API keys with max 20 targets/minute cap
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Max targets to check per minute (rate limit protection)
const MAX_TARGETS_PER_MINUTE = 20;

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

        // 1. Get all available API keys from users pool
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

        const numKeys = validUsers.length;
        console.log(`🔑 Found ${numKeys} API keys in pool`);

        // 2. Get batch of targets to check (limited to MAX_TARGETS_PER_MINUTE)
        const { data: targets, error: targetsError } = await supabaseClient
            .rpc("get_chain_targets_to_check", { p_batch_size: MAX_TARGETS_PER_MINUTE });

        if (targetsError) {
            console.error("❌ Failed to get targets:", targetsError.message);
            return new Response(JSON.stringify({ error: targetsError }), { status: 500 });
        }

        if (!targets || targets.length === 0) {
            console.log("✅ No targets to check");
            return new Response(JSON.stringify({ message: "No targets to check" }), { status: 200 });
        }

        const totalTargets = targets.length;
        console.log(`📊 Checking ${totalTargets} targets (max ${MAX_TARGETS_PER_MINUTE}/min), distributed across ${numKeys} keys`);

        // 3. Distribute targets across all available keys (round-robin)
        // Each key gets assigned targets[i] where i % numKeys === keyIndex
        const keyAssignments: Map<number, { user: DecryptedUser; targets: ChainTarget[] }> = new Map();

        validUsers.forEach((user, index) => {
            keyAssignments.set(index, { user, targets: [] });
        });

        (targets as ChainTarget[]).forEach((target, index) => {
            const keyIndex = index % numKeys;
            keyAssignments.get(keyIndex)!.targets.push(target);
        });

        // Log distribution
        keyAssignments.forEach((assignment, keyIndex) => {
            console.log(`  🔑 Key ${keyIndex + 1} (User ${assignment.user.id}): ${assignment.targets.length} targets`);
        });

        // 4. Process all keys in parallel
        let checkedCount = 0;
        let hospitalCount = 0;
        let okayCount = 0;
        let errorCount = 0;

        const processKeyTargets = async (assignment: { user: DecryptedUser; targets: ChainTarget[] }) => {
            const { user, targets: keyTargets } = assignment;
            const apiKey = user.decrypted_key;
            const results = { checked: 0, hospital: 0, okay: 0, errors: 0 };

            for (const target of keyTargets) {
                try {
                    // Small delay between calls to avoid rate limiting (200ms per request)
                    await new Promise(resolve => setTimeout(resolve, 200));

                    // Call Torn API
                    const res = await fetch(
                        `https://api.torn.com/user/${target.torn_id}?selections=profile&key=${apiKey}`
                    );
                    const data = (await res.json()) as TornProfileResponse;

                    if (data.error) {
                        console.log(`⚠️ API error for ${target.name} (Key ${user.id}): ${data.error.error}`);
                        results.errors++;
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
                        results.errors++;
                    } else {
                        results.checked++;
                        if (status === "Hospital" || status === "Jail") {
                            results.hospital++;
                        } else {
                            results.okay++;
                        }
                    }
                } catch (err) {
                    console.error(`❌ Error checking ${target.name}:`, err);
                    results.errors++;
                }
            }

            return results;
        };

        // Execute all key assignments in parallel
        const allResults = await Promise.all(
            Array.from(keyAssignments.values()).map(assignment => processKeyTargets(assignment))
        );

        // Aggregate results
        allResults.forEach(result => {
            checkedCount += result.checked;
            hospitalCount += result.hospital;
            okayCount += result.okay;
            errorCount += result.errors;
        });

        const summary = {
            total_targets: totalTargets,
            keys_used: numKeys,
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

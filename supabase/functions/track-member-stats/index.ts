
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get decrypted keys (Need at least one valid key to query users)
        const { data: decryptedUsers, error: rpcError } = await supabaseClient
            .rpc('get_decrypted_users');

        if (rpcError) throw rpcError;
        // pick one valid key
        const apiKey = decryptedUsers?.find((u: any) => u.decrypted_key)?.decrypted_key;

        if (!apiKey) {
            throw new Error('No valid API key found available.');
        }

        // 2. Get all members from faction_members
        const { data: members, error: membersError } = await supabaseClient
            .from('faction_members')
            .select('member_id');

        if (membersError) throw membersError;

        if (!members || members.length === 0) {
            return new Response(JSON.stringify({ message: 'No members to track.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // SMART STAGGERING LOGIC
        const now = new Date();
        const currentHour = now.getUTCHours();
        // Filter members: process if member_id % 6 matches current_hour % 6
        // This allows minimal load (1/6th members per hour) and updates everyone every 6h.
        const filteredMembers = members.filter((m: any) => (m.member_id % 6) === (currentHour % 6));

        console.log(`Smart Staggering: Processing ${filteredMembers.length} out of ${members.length} members (Hour: ${currentHour}, Mod: ${currentHour % 6})`);

        if (filteredMembers.length === 0) {
            return new Response(JSON.stringify({ message: 'No members scheduled for this hour.', processed: 0 }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Batch processing helper
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const results = [];

        for (const member of filteredMembers) {
            const userId = member.member_id;
            try {
                await delay(700); // Rate Limit Safety (700ms)

                const tornUrl = `https://api.torn.com/user/${userId}?selections=personalstats&key=${apiKey}`;
                const tornRes = await fetch(tornUrl);
                const tornData = await tornRes.json();

                if (tornData.error) {
                    console.error(`Torn API Error for user ${userId}:`, tornData.error);
                    results.push({ userId, status: 'error', error: tornData.error });
                    continue;
                }

                const xantakenTotal = tornData.personalstats?.xantaken || 0;

                // 3. Get Previous Record
                const { data: lastRecord, error: lastError } = await supabaseClient
                    .from('member_stats_history')
                    .select('*')
                    .eq('member_id', userId)
                    .order('recorded_at', { ascending: false })
                    .limit(1)
                    .single();

                // Allow fetch error if no rows found (it means first record)
                if (lastError && lastError.code !== 'PGRST116') {
                    console.error(`DB Error fetch last record for ${userId}:`, lastError);
                }

                let weeklyUsage = 0;
                const currentDay = now.getUTCDay(); // 0 (Sun) - 6 (Sat)

                if (!lastRecord) {
                    weeklyUsage = 0;
                } else {
                    const diff = xantakenTotal - (lastRecord.xantaken_total || 0);
                    const safeDiff = diff > 0 ? diff : 0;

                    const lastDate = new Date(lastRecord.recorded_at);
                    const isSameDay = now.toISOString().split('T')[0] === lastDate.toISOString().split('T')[0];

                    // Reset weekly usage if it's Monday and this is the first check of the day (or week) for this user/group
                    // Since this group runs every 6 hours, checking simply for "Monday" might mean 4 runs on Monday.
                    // We want to reset on the FIRST run of Monday for this user.
                    // We can check if last record was NOT Monday. or if last record was last week.
                    // Best simple check: if currentDay is 1 (Mon) AND lastRecord Day was NOT 1. => Reset.
                    // BUT: if lastRecord WAS Monday (e.g. 6 hours ago), we should NOT reset, we accumulates.
                    // What if lastRecord was LAST Monday (7 days ago)?
                    // We need date diff.

                    const dayDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                    const isNewWeek = currentDay === 1 && (lastDate.getUTCDay() !== 1 || dayDiff >= 6);

                    if (isNewWeek) {
                        weeklyUsage = safeDiff;
                    } else {
                        weeklyUsage = (lastRecord.xanax_weekly_usage || 0) + safeDiff;
                    }
                }

                // 4. Insert New Record
                const { error: insertError } = await supabaseClient
                    .from('member_stats_history')
                    .insert({
                        member_id: userId,
                        xantaken_total: xantakenTotal,
                        xanax_weekly_usage: weeklyUsage,
                        recorded_at: now.toISOString()
                    });

                if (insertError) {
                    console.error(`Insert error for ${userId}:`, insertError);
                    results.push({ userId, status: 'db_error', error: insertError });
                } else {
                    results.push({ userId, status: 'success', weeklyUsage });
                }

            } catch (err) {
                console.error(`Error processing ${userId}:`, err);
                results.push({ userId, status: 'failed', error: String(err) });
            }
        }

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

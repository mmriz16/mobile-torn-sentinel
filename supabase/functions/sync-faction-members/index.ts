
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

        // 1. Get decrypted keys
        const { data: decryptedUsers, error: rpcError } = await supabaseClient
            .rpc('get_decrypted_users');

        if (rpcError) throw rpcError;

        if (!decryptedUsers || decryptedUsers.length === 0) {
            return new Response(JSON.stringify({ message: 'No users found via get_decrypted_users.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Get faction_ids for all users
        const { data: userFactions, error: fetchError } = await supabaseClient
            .from('users')
            .select('id, faction_id')
            .not('faction_id', 'is', null);

        if (fetchError) throw fetchError;

        // 3. Map faction_id to user
        const userFactionMap = new Map();
        userFactions?.forEach(u => {
            userFactionMap.set(u.id, u.faction_id);
        });

        // 4. Group by faction_id to avoid duplicate requests
        const factionMap = new Map();
        decryptedUsers.forEach((u: any) => {
            const factionId = userFactionMap.get(u.id);
            if (factionId && u.decrypted_key && !factionMap.has(factionId)) {
                factionMap.set(factionId, u.decrypted_key);
            }
        });

        const results = [];

        // 5. Loop through each faction and fetch from Torn API
        for (const [factionId, apiKey] of factionMap.entries()) {
            try {
                console.log(`Fetching members for faction ${factionId}...`);

                const tornUrl = `https://api.torn.com/faction/${factionId}?selections=basic&key=${apiKey}`;
                const tornRes = await fetch(tornUrl);
                const tornData = await tornRes.json();

                if (tornData.error) {
                    console.error(`Torn API Error for faction ${factionId}:`, tornData.error);
                    results.push({ factionId, status: 'error', error: tornData.error });
                    continue;
                }

                const members = tornData.members;
                if (!members) {
                    console.warn(`No members found for faction ${factionId}`);
                    results.push({ factionId, status: 'no_members' });
                    continue;
                }

                const membersToUpsert = Object.entries(members).map(([idStr, member]: [string, any]) => ({
                    member_id: parseInt(idStr),
                    faction_id: factionId,
                    name: member.name,
                    level: member.level,
                    days_in_faction: member.days_in_faction,
                    position: member.position,
                    status_description: member.status?.description,
                    status_state: member.status?.state,
                    last_action: new Date(member.last_action.timestamp * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                }));

                const { error: upsertError } = await supabaseClient
                    .from('faction_members')
                    .upsert(membersToUpsert, { onConflict: 'member_id' });

                if (upsertError) {
                    console.error(`Upsert error for faction ${factionId}:`, upsertError);
                    results.push({ factionId, status: 'db_error', error: upsertError });
                } else {
                    results.push({ factionId, status: 'success', count: membersToUpsert.length });
                }

            } catch (err) {
                console.error(`Unexpected error for faction ${factionId}:`, err);
                results.push({ factionId, status: 'failed', error: String(err) });
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

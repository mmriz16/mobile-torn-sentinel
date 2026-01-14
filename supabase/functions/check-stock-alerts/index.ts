import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface StockAlert {
    item_id: number;
    country_code: string;
    last_qty: number;
}

interface UserNotification {
    user_id: number;
    stock_alerts: StockAlert[];
}

interface UserTravelStatus {
    user_id: number;
    travel_destination: string | null;
    travel_state: string | null;
}

interface ForeignStock {
    item_id: number;
    country_code: string;
    quantity: number;
}

// Country name to code mapping
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
    "Argentina": "arg",
    "Canada": "can",
    "Cayman Islands": "cay",
    "China": "chi",
    "Hawaii": "haw",
    "Japan": "jap",
    "Mexico": "mex",
    "South Africa": "sou",
    "Switzerland": "swi",
    "UAE": "uae",
    "United Arab Emirates": "uae",
    "United Kingdom": "uni",
    "UK": "uni"
};

serve(async (_req) => {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        console.log("🔔 Starting stock alert check...");

        // 1. Get all users with stock alerts enabled
        const { data: notifications, error: notifError } = await supabaseAdmin
            .from('user_notifications')
            .select('user_id, stock_alerts')
            .not('stock_alerts', 'is', null)
            .neq('stock_alerts', '[]');

        if (notifError) {
            console.error("Error fetching notifications:", notifError);
            throw notifError;
        }

        if (!notifications || notifications.length === 0) {
            console.log("📭 No users with stock alerts found.");
            return new Response(JSON.stringify({ checked: 0, alerts_sent: 0 }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log(`👤 Found ${notifications.length} users with stock alerts`);

        // 2. Get all user travel statuses
        const userIds = notifications.map(n => n.user_id);
        const { data: travelStatuses, error: travelError } = await supabaseAdmin
            .from('user_travel_status')
            .select('user_id, travel_destination, travel_state')
            .in('user_id', userIds);

        if (travelError) {
            console.error("Error fetching travel statuses:", travelError);
            throw travelError;
        }

        const travelMap = new Map<number, UserTravelStatus>();
        travelStatuses?.forEach(ts => travelMap.set(ts.user_id, ts));

        // 3. Get current foreign stock quantities
        const { data: foreignStocks, error: stockError } = await supabaseAdmin
            .from('item_foreign_stocks')
            .select('item_id, country_code, quantity');

        if (stockError) {
            console.error("Error fetching foreign stocks:", stockError);
            throw stockError;
        }

        const stockMap = new Map<string, number>();
        foreignStocks?.forEach(fs => {
            stockMap.set(`${fs.item_id}-${fs.country_code}`, fs.quantity);
        });

        // 4. Get item names for notifications
        const allItemIds = new Set<number>();
        notifications.forEach(n => {
            (n.stock_alerts as StockAlert[]).forEach(a => allItemIds.add(a.item_id));
        });

        const { data: items } = await supabaseAdmin
            .from('items')
            .select('id, name')
            .in('id', Array.from(allItemIds));

        const itemNameMap = new Map<number, string>();
        items?.forEach(i => itemNameMap.set(i.id, i.name));

        // 5. Get push tokens
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id, push_token')
            .in('id', userIds)
            .not('push_token', 'is', null);

        const pushTokenMap = new Map<number, string>();
        users?.forEach(u => pushTokenMap.set(u.id, u.push_token));

        // 6. Check each user's alerts
        let alertsSent = 0;
        const updatedAlerts: { userId: number; alerts: StockAlert[] }[] = [];

        for (const notif of notifications as UserNotification[]) {
            const userId = notif.user_id;
            const alerts = notif.stock_alerts;
            const travelStatus = travelMap.get(userId);
            const pushToken = pushTokenMap.get(userId);

            // Skip if user is not traveling or no push token
            if (!travelStatus?.travel_destination || !pushToken) {
                continue;
            }

            // Convert destination to country code
            const destCountryCode = COUNTRY_NAME_TO_CODE[travelStatus.travel_destination];
            if (!destCountryCode) {
                console.log(`⚠️ Unknown destination: ${travelStatus.travel_destination} for user ${userId}`);
                continue;
            }

            console.log(`🛫 User ${userId} traveling to ${travelStatus.travel_destination} (${destCountryCode})`);

            // Filter alerts for destination country only
            const relevantAlerts = alerts.filter(a => a.country_code === destCountryCode);
            if (relevantAlerts.length === 0) {
                continue;
            }

            // Check each relevant alert
            const newAlerts = [...alerts];
            for (const alert of relevantAlerts) {
                const currentQty = stockMap.get(`${alert.item_id}-${alert.country_code}`) ?? 0;
                const lastQty = alert.last_qty;
                const itemName = itemNameMap.get(alert.item_id) || `Item #${alert.item_id}`;

                let message: string | null = null;

                // Check for stock changes
                if (currentQty === 0 && lastQty > 0) {
                    message = `❌ ${itemName} is OUT OF STOCK in ${travelStatus.travel_destination}!`;
                } else if (currentQty > 0 && lastQty === 0) {
                    message = `✅ ${itemName} is BACK IN STOCK (x${currentQty}) in ${travelStatus.travel_destination}!`;
                } else if (currentQty > 0 && currentQty < 50 && lastQty >= 50) {
                    message = `⚠️ ${itemName} is LOW STOCK (x${currentQty}) in ${travelStatus.travel_destination}!`;
                }

                // Update last_qty in alerts
                const alertIndex = newAlerts.findIndex(
                    a => a.item_id === alert.item_id && a.country_code === alert.country_code
                );
                if (alertIndex !== -1) {
                    newAlerts[alertIndex].last_qty = currentQty;
                }

                // Send notification if there's a message
                if (message) {
                    console.log(`📨 Sending to user ${userId}: ${message}`);

                    // Send FCM notification via Expo Push
                    try {
                        await fetch('https://exp.host/--/api/v2/push/send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                to: pushToken,
                                title: '📦 Foreign Stock Alert',
                                body: message,
                                sound: 'default',
                                priority: 'high'
                            })
                        });
                        alertsSent++;
                    } catch (pushError) {
                        console.error(`Failed to send push to user ${userId}:`, pushError);
                    }
                }
            }

            // Save updated alerts
            updatedAlerts.push({ userId, alerts: newAlerts });
        }

        // 7. Batch update all modified alerts
        for (const { userId, alerts } of updatedAlerts) {
            await supabaseAdmin
                .from('user_notifications')
                .update({ stock_alerts: alerts })
                .eq('user_id', userId);
        }

        console.log(`✅ Check complete. Alerts sent: ${alertsSent}`);

        return new Response(JSON.stringify({
            checked: notifications.length,
            alerts_sent: alertsSent
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        console.error("❌ Error:", err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});

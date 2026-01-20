// Cleanup old foreign stock history data (older than 7 days)
// Schedule this function via Supabase Cron: e.g., daily at midnight
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (_req) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🧹 Starting foreign stock history cleanup...");

    // Delete records older than 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const { data, error, count } = await supabase
        .from("foreign_stock_history")
        .delete()
        .lt("recorded_at", cutoffDate.toISOString())
        .select("id", { count: "exact" });

    if (error) {
        console.error("❌ Cleanup failed:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    const deletedCount = data?.length ?? 0;
    console.log(`✅ Cleanup complete. Deleted ${deletedCount} old records.`);

    return new Response(
        JSON.stringify({
            success: true,
            deleted: deletedCount,
            cutoff: cutoffDate.toISOString(),
        }),
        {
            status: 200,
            headers: { "Content-Type": "application/json" },
        }
    );
});

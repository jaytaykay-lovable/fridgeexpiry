import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Web Push library for Deno
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

    webpush.setVapidDetails(
      "mailto:noreply@fridgekeeper.app",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users with settings
    const { data: allSettings, error: settingsError } = await supabase
      .from("user_settings")
      .select("user_id, notify_days_before");

    if (settingsError) throw settingsError;

    let totalSent = 0;

    for (const settings of allSettings || []) {
      const thresholdDate = new Date(
        Date.now() + settings.notify_days_before * 86400000
      ).toISOString().split("T")[0];

      // Find items expiring soon
      const { data: expiringItems } = await supabase
        .from("food_items")
        .select("name, expiry_date")
        .eq("user_id", settings.user_id)
        .eq("status", "active")
        .lte("expiry_date", thresholdDate)
        .order("expiry_date", { ascending: true });

      if (!expiringItems || expiringItems.length === 0) continue;

      // Get push subscriptions
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", settings.user_id);

      if (!subscriptions || subscriptions.length === 0) continue;

      const itemNames = expiringItems.slice(0, 3).map((i) => i.name).join(", ");
      const body =
        expiringItems.length <= 3
          ? `${itemNames} expiring soon!`
          : `${itemNames} and ${expiringItems.length - 3} more expiring soon!`;

      const payload = JSON.stringify({
        title: "🧊 FridgeKeeper Alert",
        body,
        tag: "expiry-alert",
        url: "/",
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          totalSent++;
        } catch (pushErr: any) {
          console.error("Push failed for endpoint:", sub.endpoint, pushErr.message);
          // Remove invalid subscriptions (410 Gone)
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
        }
      }
    }

    console.log(`Sent ${totalSent} notifications`);

    return new Response(
      JSON.stringify({ success: true, notifications_sent: totalSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("check-expiry-notifications error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

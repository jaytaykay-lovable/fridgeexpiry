// Fetch detailed recipe info from Spoonacular (ingredients + instructions)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const fridgeIngredientsRaw = url.searchParams.get("fridge") || "";
    const fridgeIngredients = fridgeIngredientsRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (!id || !/^\d+$/.test(id)) {
      return new Response(JSON.stringify({ error: "valid id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("SPOONACULAR_API_KEY");
    if (!apiKey) throw new Error("SPOONACULAR_API_KEY is not configured");

    const infoUrl = new URL(`https://api.spoonacular.com/recipes/${id}/information`);
    infoUrl.searchParams.set("apiKey", apiKey);
    infoUrl.searchParams.set("includeNutrition", "false");

    const res = await fetch(infoUrl.toString());
    if (!res.ok) {
      const text = await res.text();
      console.error("Spoonacular info failed", res.status, text);
      return new Response(JSON.stringify({ error: `Recipe lookup failed (${res.status})` }), {
        status: res.status === 404 ? 404 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();

    const fridgeSet = new Set(fridgeIngredients);
    const isInFridge = (name: string) => {
      const lower = name.toLowerCase();
      for (const f of fridgeSet) {
        if (lower.includes(f) || f.includes(lower)) return true;
      }
      return false;
    };

    const ingredients = (data.extendedIngredients || []).map((i: any) => ({
      name: i.name || i.originalName || "ingredient",
      amount: i.measures?.metric?.amount ? String(Math.round(i.measures.metric.amount * 10) / 10) : (i.amount ? String(i.amount) : ""),
      unit: i.measures?.metric?.unitShort || i.unit || "",
      inFridge: isInFridge(i.name || i.originalName || ""),
    }));

    let instructions: { step: number; text: string }[] = [];
    if (Array.isArray(data.analyzedInstructions) && data.analyzedInstructions[0]?.steps) {
      instructions = data.analyzedInstructions[0].steps.map((s: any) => ({
        step: s.number,
        text: s.step,
      }));
    } else if (data.instructions) {
      // Plain HTML/text fallback — split by sentences
      const stripped = String(data.instructions).replace(/<[^>]+>/g, " ").trim();
      instructions = stripped
        .split(/\.\s+/)
        .filter(Boolean)
        .map((text: string, idx: number) => ({ step: idx + 1, text: text.trim() + (text.endsWith(".") ? "" : ".") }));
    }

    return new Response(
      JSON.stringify({
        id: data.id,
        title: data.title,
        image: data.image,
        readyMinutes: data.readyInMinutes ?? 30,
        servings: data.servings ?? 2,
        likes: data.aggregateLikes ?? 0,
        sourceUrl: data.sourceUrl,
        usedIngredients: ingredients.filter((i: any) => i.inFridge).map((i: any) => i.name),
        missedIngredients: ingredients.filter((i: any) => !i.inFridge).map((i: any) => i.name),
        matchScore: ingredients.filter((i: any) => i.inFridge).length,
        reason: "",
        ingredients,
        instructions,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("recipe-detail error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

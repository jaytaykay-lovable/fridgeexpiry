// Recipe discovery edge function
// - Calls Spoonacular findByIngredients + complexSearch in parallel
// - Uses Lovable AI to re-rank results and generate one-line "why" reasons
// - Caches recipe metadata in recipe_cache for 24h
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPOONACULAR_BASE = "https://api.spoonacular.com";

interface IngredientInput {
  name: string;
  expiryDays?: number; // negative = expired, smaller = more urgent
}

interface RequestBody {
  ingredients: IngredientInput[];
  mood?: "quick" | "comfort" | "healthy" | "fancy" | null;
}

const moodToCuisine: Record<string, { cuisine?: string; type?: string; maxReadyMinutes?: number }> = {
  quick: { maxReadyMinutes: 30 },
  comfort: { type: "main course" },
  healthy: { type: "main course" },
  fancy: {},
};

function hashKey(parts: string[]): string {
  const sorted = [...parts].map((p) => p.toLowerCase().trim()).sort().join("|");
  // simple deterministic hash (djb2)
  let h = 5381;
  for (let i = 0; i < sorted.length; i++) h = (h * 33) ^ sorted.charCodeAt(i);
  return (h >>> 0).toString(36);
}

async function callSpoonacular(path: string, params: Record<string, string>) {
  const apiKey = Deno.env.get("SPOONACULAR_API_KEY");
  if (!apiKey) throw new Error("SPOONACULAR_API_KEY is not configured");
  const url = new URL(`${SPOONACULAR_BASE}${path}`);
  url.searchParams.set("apiKey", apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spoonacular ${path} failed [${res.status}]: ${text.slice(0, 200)}`);
  }
  return await res.json();
}

async function rerankWithAI(
  recipes: any[],
  selectedIngredients: string[],
  expiringSet: Set<string>,
  mood: string | null,
): Promise<{ id: number; reason: string }[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    // fallback: just take first 3 with generic reasons
    return recipes.slice(0, 3).map((r) => ({
      id: r.id,
      reason: `Uses ${(r.usedIngredients || []).length} of your fridge items.`,
    }));
  }

  const compact = recipes.slice(0, 12).map((r) => ({
    id: r.id,
    title: r.title,
    used: (r.usedIngredients || []).map((i: any) => i.name),
    missed: (r.missedIngredients || []).map((i: any) => i.name),
    readyMinutes: r.readyMinutes ?? null,
  }));

  const systemPrompt = `You rank recipes for a fridge-management app. Score by:
- 50%: how many EXPIRING items the recipe uses
- 30%: match with mood (${mood ?? "no preference"})
- 20%: penalize many missed ingredients
Return the 3 best with a short, warm one-line reason each (max 12 words).`;

  const userPrompt = JSON.stringify({
    selectedIngredients,
    expiringIngredients: Array.from(expiringSet),
    mood,
    recipes: compact,
  });

  const body = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "rank_recipes",
          description: "Return the top 3 recipe IDs in order with reasons.",
          parameters: {
            type: "object",
            properties: {
              picks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                    reason: { type: "string" },
                  },
                  required: ["id", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["picks"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "rank_recipes" } },
  };

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("AI rerank failed", res.status, await res.text());
      throw new Error("rerank fail");
    }
    const data = await res.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = JSON.parse(args);
    const picks = (parsed.picks || []).slice(0, 3);
    if (picks.length === 0) throw new Error("no picks");
    return picks;
  } catch (e) {
    console.error("rerank error, falling back:", e);
    return recipes.slice(0, 3).map((r) => ({
      id: r.id,
      reason: `Uses ${(r.usedIngredients || []).length} of your fridge items.`,
    }));
  }
}

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
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const adminClient = createClient(supabaseUrl, serviceRole);

    const body = (await req.json()) as RequestBody;
    if (!body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      return new Response(JSON.stringify({ error: "ingredients required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ingredientNames = body.ingredients.map((i) => i.name).filter(Boolean);
    const expiringSet = new Set(
      body.ingredients
        .filter((i) => typeof i.expiryDays === "number" && i.expiryDays! <= 3)
        .map((i) => i.name.toLowerCase()),
    );

    const moodCfg = body.mood ? moodToCuisine[body.mood] || {} : {};

    const ingredientsCsv = ingredientNames.slice(0, 10).join(",");

    // Parallel calls
    const findPromise = callSpoonacular("/recipes/findByIngredients", {
      ingredients: ingredientsCsv,
      number: "10",
      ranking: "1",
      ignorePantry: "true",
    });

    const complexParams: Record<string, string> = {
      includeIngredients: ingredientsCsv,
      number: "10",
      addRecipeInformation: "true",
      sort: "max-used-ingredients",
      instructionsRequired: "false",
    };
    if (moodCfg.type) complexParams.type = moodCfg.type;
    if (moodCfg.maxReadyMinutes) complexParams.maxReadyTime = String(moodCfg.maxReadyMinutes);

    const complexPromise = callSpoonacular("/recipes/complexSearch", complexParams).catch((e) => {
      console.warn("complexSearch failed, continuing", e);
      return { results: [] };
    });

    const [findResults, complexResults] = await Promise.all([findPromise, complexPromise]);

    // Normalize and merge
    const merged = new Map<number, any>();
    for (const r of findResults || []) {
      merged.set(r.id, {
        id: r.id,
        title: r.title,
        image: r.image,
        usedIngredients: r.usedIngredients || [],
        missedIngredients: r.missedIngredients || [],
        likes: r.likes || 0,
        readyMinutes: undefined,
        servings: undefined,
        sourceUrl: undefined,
      });
    }
    for (const r of complexResults?.results || []) {
      const existing = merged.get(r.id) || {
        id: r.id,
        title: r.title,
        image: r.image,
        usedIngredients: [],
        missedIngredients: [],
        likes: 0,
      };
      existing.title = existing.title || r.title;
      existing.image = existing.image || r.image;
      existing.readyMinutes = r.readyMinutes;
      existing.servings = r.servings;
      existing.sourceUrl = r.sourceUrl;
      existing.likes = existing.likes || r.aggregateLikes || 0;
      merged.set(r.id, existing);
    }

    const allRecipes = Array.from(merged.values());

    if (allRecipes.length === 0) {
      return new Response(JSON.stringify({ top: [], explore: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply mood filter for "quick"
    let filtered = allRecipes;
    if (body.mood === "quick") {
      filtered = allRecipes.filter((r) => !r.readyMinutes || r.readyMinutes <= 30);
      if (filtered.length < 3) filtered = allRecipes; // fallback
    }

    const picks = await rerankWithAI(filtered, ingredientNames, expiringSet, body.mood ?? null);

    const pickIds = new Set(picks.map((p) => p.id));
    const top = picks
      .map((p) => {
        const r = filtered.find((x) => x.id === p.id) || allRecipes.find((x) => x.id === p.id);
        if (!r) return null;
        return { ...r, reason: p.reason };
      })
      .filter(Boolean) as any[];

    const explore = filtered.filter((r) => !pickIds.has(r.id)).slice(0, 6);

    // Cache (best-effort, only top picks since they have full data)
    const cacheRows = top.map((r) => ({
      cache_key: `${r.id}`,
      spoonacular_id: r.id,
      title: r.title,
      image_url: r.image,
      source_url: r.sourceUrl ?? null,
      ready_minutes: r.readyMinutes ?? null,
      servings: r.servings ?? null,
      likes: r.likes ?? 0,
      used_ingredients: r.usedIngredients ?? [],
      missed_ingredients: r.missedIngredients ?? [],
      payload: r,
      cached_at: new Date().toISOString(),
    }));
    if (cacheRows.length > 0) {
      adminClient
        .from("recipe_cache")
        .upsert(cacheRows, { onConflict: "cache_key" })
        .then(({ error }) => {
          if (error) console.warn("cache upsert failed", error);
        });
    }

    const shape = (r: any) => ({
      id: r.id,
      title: r.title,
      image: r.image,
      readyMinutes: r.readyMinutes ?? 30,
      servings: r.servings ?? 2,
      likes: r.likes ?? 0,
      usedIngredients: (r.usedIngredients || []).map((i: any) => (typeof i === "string" ? i : i.name)),
      missedIngredients: (r.missedIngredients || []).map((i: any) => (typeof i === "string" ? i : i.name)),
      matchScore: (r.usedIngredients || []).length,
      reason: r.reason || `Uses ${(r.usedIngredients || []).length} of your fridge items.`,
      sourceUrl: r.sourceUrl ?? `https://spoonacular.com/recipes/${encodeURIComponent(r.title || "")}-${r.id}`,
    });

    return new Response(
      JSON.stringify({ top: top.map(shape), explore: explore.map(shape) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("discover-recipes error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_url, default_expiry_days } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const today = new Date().toISOString().split("T")[0];
    const fallbackDate = new Date(
      Date.now() + (default_expiry_days || 7) * 86400000
    )
      .toISOString()
      .split("T")[0];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a food recognition AI. Analyze the image and identify all visible food items. For each item, extract: name, category (one of: Dairy, Meat, Seafood, Fruits, Vegetables, Grains, Beverages, Snacks, Condiments, Frozen, Bakery, Other), and expiry_date (YYYY-MM-DD format). Today is ${today}. If you cannot determine the expiry date, use ${fallbackDate} and set is_flagged to true. Otherwise set is_flagged to false.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: image_url },
                },
                {
                  type: "text",
                  text: "Identify all food items in this image. Return the results using the extract_food_items function.",
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_food_items",
                description: "Extract food items from the image",
                parameters: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          category: {
                            type: "string",
                            enum: [
                              "Dairy",
                              "Meat",
                              "Seafood",
                              "Fruits",
                              "Vegetables",
                              "Grains",
                              "Beverages",
                              "Snacks",
                              "Condiments",
                              "Frozen",
                              "Bakery",
                              "Other",
                            ],
                          },
                          expiry_date: { type: "string" },
                          is_flagged: { type: "boolean" },
                        },
                        required: [
                          "name",
                          "category",
                          "expiry_date",
                          "is_flagged",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["items"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_food_items" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI processing failed");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({ items: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ items: parsed.items || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-food-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

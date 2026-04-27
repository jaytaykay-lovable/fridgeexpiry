import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create service-role client to bypass RLS for queue updates
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { queue_id, default_expiry_days } = await req.json();
    if (!queue_id) {
      return new Response(
        JSON.stringify({ error: "Missing queue_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing queue item:", queue_id);

    // Fetch the queue row
    const { data: queueItem, error: fetchError } = await supabase
      .from("ingestion_queue")
      .select("*")
      .eq("id", queue_id)
      .single();

    if (fetchError || !queueItem) {
      console.error("Queue item not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Queue item not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as processing (idempotency guard)
    if (queueItem.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Item already being processed", status: queueItem.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("ingestion_queue")
      .update({ status: "processing" })
      .eq("id", queue_id);

    try {
      if (queueItem.input_type === "text") {
        // Text input: use LLM to parse name/category/date from raw_payload
        await processTextInput(supabase, queueItem, default_expiry_days);
      } else if (queueItem.input_type === "image") {
        // Image input: generate signed URL and send to vision LLM
        await processImageInput(supabase, queueItem, default_expiry_days);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (processingError) {
      console.error("Processing failed:", processingError);
      await supabase
        .from("ingestion_queue")
        .update({
          status: "failed",
          error_message: processingError instanceof Error ? processingError.message : "Unknown error",
        })
        .eq("id", queue_id);

      return new Response(
        JSON.stringify({ error: "Processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("process-food-image error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processTextInput(
  supabase: any,
  queueItem: any,
  defaultExpiryDays: number
) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const today = new Date().toISOString().split("T")[0];
  const fallbackDate = new Date(
    Date.now() + (defaultExpiryDays || 7) * 86400000
  ).toISOString().split("T")[0];

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
            content: `You are a food item parser. Given a text description of food, extract: name, category (one of: Dairy, Meat, Seafood, Fruits, Vegetables, Grains, Beverages, Snacks, Condiments, Frozen, Bakery, Other), and expiry_date (YYYY-MM-DD). Today is ${today}. If no expiry date mentioned, use ${fallbackDate} and set is_flagged to true.`,
          },
          {
            role: "user",
            content: `Parse this food item: "${queueItem.raw_payload}". Return results using the extract_food_item function.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_food_item",
              description: "Extract a food item from text",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  category: {
                    type: "string",
                    enum: ["Dairy", "Meat", "Seafood", "Fruits", "Vegetables", "Grains", "Beverages", "Snacks", "Condiments", "Frozen", "Bakery", "Other"],
                  },
                  expiry_date: { type: "string" },
                  is_flagged: { type: "boolean" },
                },
                required: ["name", "category", "expiry_date", "is_flagged"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_food_item" } },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("AI gateway error:", response.status, text);
    throw new Error(`AI processing failed (${response.status})`);
  }

  const result = await response.json();
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall) throw new Error("No AI extraction result");

  const parsed = JSON.parse(toolCall.function.arguments);

  await supabase
    .from("ingestion_queue")
    .update({
      status: "completed",
      extracted_name: parsed.name,
      extracted_date: parsed.expiry_date,
      extracted_category: parsed.category || "Other",
      is_flagged: parsed.is_flagged || false,
    })
    .eq("id", queueItem.id);
}

async function processImageInput(
  supabase: any,
  queueItem: any,
  defaultExpiryDays: number
) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  // Create signed URL for the image
  const { data: signedData, error: signedError } = await supabase.storage
    .from("fridge-images")
    .createSignedUrl(queueItem.image_path, 600);

  if (signedError || !signedData) {
    throw new Error("Failed to create signed URL for image");
  }

  const imageUrl = signedData.signedUrl;
  console.log("Processing image URL:", imageUrl);

  const today = new Date().toISOString().split("T")[0];
  const fallbackDate = new Date(
    Date.now() + (defaultExpiryDays || 7) * 86400000
  ).toISOString().split("T")[0];

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
              { type: "image_url", image_url: { url: imageUrl } },
              { type: "text", text: "Identify all food items in this image. Return the results using the extract_food_items function." },
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
                          enum: ["Dairy", "Meat", "Seafood", "Fruits", "Vegetables", "Grains", "Beverages", "Snacks", "Condiments", "Frozen", "Bakery", "Other"],
                        },
                        expiry_date: { type: "string" },
                        is_flagged: { type: "boolean" },
                      },
                      required: ["name", "category", "expiry_date", "is_flagged"],
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
        tool_choice: { type: "function", function: { name: "extract_food_items" } },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("AI gateway error:", response.status, text);
    throw new Error(`AI processing failed (${response.status})`);
  }

  const result = await response.json();
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

  if (!toolCall) throw new Error("No AI extraction result");

  const parsed = JSON.parse(toolCall.function.arguments);
  const items = parsed.items || [];

  if (items.length === 0) {
    await supabase
      .from("ingestion_queue")
      .update({ status: "failed", error_message: "No food items detected in image" })
      .eq("id", queueItem.id);
    return;
  }

  // For the first item, update the existing queue row
  const first = items[0];
  await supabase
    .from("ingestion_queue")
    .update({
      status: "completed",
      extracted_name: first.name,
      extracted_date: first.expiry_date,
      extracted_category: first.category || "Other",
      is_flagged: first.is_flagged || false,
    })
    .eq("id", queueItem.id);

  // For additional items, insert new completed queue rows
  if (items.length > 1) {
    const additionalRows = items.slice(1).map((item: any) => ({
      user_id: queueItem.user_id,
      input_type: "image",
      image_path: queueItem.image_path,
      status: "completed",
      extracted_name: item.name,
      extracted_date: item.expiry_date,
      extracted_category: item.category || "Other",
      is_flagged: item.is_flagged || false,
    }));

    await supabase.from("ingestion_queue").insert(additionalRows);
  }
}

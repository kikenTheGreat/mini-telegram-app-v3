import { supaAdmin, validateTelegram, corsHeaders } from "../_shared/telegram.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const initData = body.initData;

    if (!initData) {
      throw new Error("Missing initData");
    }

    const { user_id, username, first_name, last_name } = validateTelegram(initData);
    const today = new Date().toISOString().slice(0, 10);

    // Upsert profile
    await supaAdmin.from("profiles").upsert({
      user_id,
      username,
      first_name,
      last_name,
    });

    // Check existing claim for today
    const { data: existing } = await supaAdmin
      .from("daily_claims")
      .select("claim_date")
      .eq("user_id", user_id)
      .eq("claim_date", today)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ ok: false, reason: "already_claimed_today" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert daily claim
    const { error: claimError } = await supaAdmin.from("daily_claims").insert({
      user_id,
      claim_date: today,
    });

    if (claimError) throw claimError;

    // Update task progress
    await supaAdmin.from("task_progress").upsert({
      user_id,
      task_id: "daily",
      status: "claimed",
      updated_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ ok: true, claim_date: today, reward: 555 }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

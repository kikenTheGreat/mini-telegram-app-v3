import { supaAdmin, validateTelegram, corsHeaders } from "../_shared/telegram.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const initData = body.initData;
    const amount = body.amount as number;

    if (!initData) {
      throw new Error("Missing initData");
    }

    if (typeof amount !== "number" || amount <= 0) {
      throw new Error("Invalid wager amount");
    }

    const { user_id, username, first_name, last_name } = validateTelegram(initData);

    // Upsert profile
    await supaAdmin.from("profiles").upsert({
      user_id,
      username,
      first_name,
      last_name,
    });

    // Record wager for current month
    const { error: wagerError } = await supaAdmin.rpc("record_wager", {
      p_user_id: user_id,
      p_username: username,
      p_amount: amount,
    });

    if (wagerError) throw wagerError;

    return new Response(
      JSON.stringify({ ok: true, amount }),
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

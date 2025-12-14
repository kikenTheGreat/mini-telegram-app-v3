import { supaAdmin, validateTelegram, corsHeaders } from "../_shared/telegram.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const initData = body.initData;
    const event_type = body.event_type as "share" | "click" | "join";
    const meta = body.meta ?? {};

    if (!initData) {
      throw new Error("Missing initData");
    }

    if (!["share", "click", "join"].includes(event_type)) {
      throw new Error("Invalid event_type");
    }

    const { user_id, username, first_name, last_name } = validateTelegram(initData);

    // Upsert profile
    await supaAdmin.from("profiles").upsert({
      user_id,
      username,
      first_name,
      last_name,
    });

    // Record invite event
    const { error: eventError } = await supaAdmin.from("invite_events").insert({
      user_id,
      username,
      event_type,
      meta,
    });

    if (eventError) throw eventError;

    // If it's a join event, increment the invite count
    if (event_type === "join") {
      const { error: statError } = await supaAdmin.rpc("inc_invite_stat", {
        p_user_id: user_id,
        p_username: username,
      });

      if (statError) throw statError;
    }

    return new Response(
      JSON.stringify({ ok: true, event_type }),
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

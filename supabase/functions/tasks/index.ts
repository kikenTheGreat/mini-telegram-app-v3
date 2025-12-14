import { supaAdmin, validateTelegram, corsHeaders } from "../_shared/telegram.ts";

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { initData, task_id, status } = body || {};

    if (!initData) throw new Error("Missing initData");
    if (!task_id) throw new Error("Missing task_id");
    if (!status) throw new Error("Missing status");

    if (!["completed", "claimed"].includes(status)) {
      throw new Error("Invalid status");
    }

    // Validate Telegram payload and get user info
    const { user_id, username, first_name, last_name } = validateTelegram(initData);

    // Upsert profile
    await supaAdmin.from("profiles").upsert({
      user_id,
      username,
      first_name,
      last_name,
    });

    // Upsert task progress
    const { error } = await supaAdmin.from("task_progress").upsert({
      user_id,
      task_id,
      status,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, task_id, status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

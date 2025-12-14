import { supaAdmin, validateTelegram, corsHeaders } from "../_shared/telegram.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const initData = body.initData;
    const prize = body.prize as { label: string; icon?: string };

    if (!initData) {
      throw new Error("Missing initData");
    }

    if (!prize?.label) {
      throw new Error("Missing prize data");
    }

    const { user_id, username, first_name, last_name } = validateTelegram(initData);

    // Upsert profile
    await supaAdmin.from("profiles").upsert({
      user_id,
      username,
      first_name,
      last_name,
    });

    // Optional: Rate limiting - prevent spinning more than once per 10 seconds
    const { data: lastSpin } = await supaAdmin
      .from("spins")
      .select("created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastSpin) {
      const timeSince = Date.now() - new Date(lastSpin.created_at).getTime();
      if (timeSince < 10_000) {
        return new Response(
          JSON.stringify({
            ok: false,
            reason: "rate_limited",
            wait_seconds: Math.ceil((10_000 - timeSince) / 1000),
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Record spin
    const { error: spinError } = await supaAdmin.from("spins").insert({
      user_id,
      username,
      prize: prize.label,
      icon: prize.icon || "",
    });

    if (spinError) throw spinError;

    return new Response(
      JSON.stringify({ ok: true, prize }),
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

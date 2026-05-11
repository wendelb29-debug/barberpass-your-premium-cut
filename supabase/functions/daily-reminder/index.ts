import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsApp, corsHeaders } from "../_shared/uazapi.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const ADDRESS = Deno.env.get("BARBERPASS_ADDRESS") ?? "Confira o endereço no portal";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);

    const { data: appts, error } = await supabase
      .from("appointments")
      .select("id, scheduled_at, user_id, status")
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", end.toISOString())
      .in("status", ["scheduled", "confirmed"]);
    if (error) throw error;

    let sent = 0;
    for (const a of appts ?? []) {
      const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", a.user_id).single();
      if (!profile?.phone) continue;
      const time = new Date(a.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const r = await sendWhatsApp(profile.phone,
        `⏰ *Lembrete BarberPass!*\n\nOlá, ${profile.full_name}! Seu corte é HOJE.\n\n🕐 Horário: ${time}\n📍 Endereço: ${ADDRESS}\n\nResponda *CONFIRMAR* para confirmar ou *CANCELAR* para cancelar.`);
      if (r.ok) {
        await supabase.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", a.id);
        sent++;
      }
    }
    return new Response(JSON.stringify({ ok: true, total: appts?.length ?? 0, sent }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});

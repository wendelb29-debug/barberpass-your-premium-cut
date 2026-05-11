import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsApp, corsHeaders } from "../_shared/uazapi.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SERVICE_LABEL: Record<string, string> = {
  haircut: "Corte de cabelo",
  beard: "Barba",
  combo: "Corte + Barba",
  treatment: "Hidratação",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { appointmentId } = await req.json();
    if (!appointmentId) return new Response("missing appointmentId", { status: 400, headers: corsHeaders });

    const { data: appt, error } = await supabase
      .from("appointments")
      .select("id, scheduled_at, service_type, user_id, barber_id")
      .eq("id", appointmentId).single();
    if (error || !appt) throw error ?? new Error("appointment not found");

    const [{ data: profile }, { data: barber }] = await Promise.all([
      supabase.from("profiles").select("full_name, phone").eq("id", appt.user_id).single(),
      supabase.from("barbers").select("full_name, phone").eq("id", appt.barber_id).single(),
    ]);

    const dt = new Date(appt.scheduled_at);
    const date = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const service = SERVICE_LABEL[appt.service_type] ?? appt.service_type;
    const barberName = barber?.full_name ?? "—";
    const clientName = profile?.full_name ?? "Cliente";

    if (profile?.phone) {
      await sendWhatsApp(profile.phone,
        `✅ *Agendamento confirmado!*\n\nOlá, ${clientName}! Seu agendamento na BarberPass foi confirmado.\n\n📅 Data: ${date}\n⏰ Horário: ${time}\n✂️ Serviço: ${service}\n💈 Barbeiro: ${barberName}\n\nAté lá! 😊`);
    }
    if (barber?.phone) {
      await sendWhatsApp(barber.phone,
        `📋 *Novo agendamento*\n\nCliente: ${clientName}\n📅 ${date} às ${time}\n✂️ ${service}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});

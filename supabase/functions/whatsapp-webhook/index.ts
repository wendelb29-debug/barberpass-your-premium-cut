// UazAPI webhook: handles reminder replies (CONFIRMAR/CANCELAR) and the
// conversational booking bot (state machine persisted in whatsapp_sessions).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsApp, normalizePhone, corsHeaders } from "../_shared/uazapi.ts";

async function getOrCreateConversation(phone: string) {
  const { data: profile } = await supabase.from("profiles").select("id").eq("phone", phone).maybeSingle();
  const { data: existing } = await supabase.from("conversations").select("*").eq("phone", phone).maybeSingle();
  if (existing) {
    if (!existing.client_id && profile) {
      await supabase.from("conversations").update({ client_id: profile.id }).eq("id", existing.id);
    }
    return existing;
  }
  const { data: created } = await supabase.from("conversations").insert({
    phone, client_id: profile?.id ?? null, mode: "bot", status: "open",
  }).select().single();
  return created!;
}

async function logMessage(conversationId: string, body: string, senderType: "client"|"bot"|"agent"|"system", senderName?: string) {
  await supabase.from("messages").insert({
    conversation_id: conversationId, body, sender_type: senderType, sender_name: senderName ?? null,
  });
}

async function sendAndLog(conversationId: string, phone: string, body: string, senderType: "bot"|"agent"|"system" = "bot") {
  await sendWhatsApp(phone, body);
  await logMessage(conversationId, body, senderType, senderType === "bot" ? "Bot" : undefined);
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const PORTAL = Deno.env.get("PORTAL_URL") ?? "https://barberpass.lovable.app";

const SERVICES = [
  { id: "haircut", label: "Corte de cabelo", price: 40 },
  { id: "combo",   label: "Corte + Barba",   price: 60 },
  { id: "beard",   label: "Barba",            price: 30 },
  { id: "treatment", label: "Hidratação",     price: 25 },
];

const SESSION_TTL_MIN = 30;

async function getSession(phone: string) {
  const { data } = await supabase.from("whatsapp_sessions").select("*").eq("phone", phone).maybeSingle();
  if (!data) return null;
  const age = (Date.now() - new Date(data.updated_at).getTime()) / 60000;
  if (age > SESSION_TTL_MIN) {
    await supabase.from("whatsapp_sessions").update({ state: "idle", data_json: {}, human_handoff: false }).eq("phone", phone);
    return { ...data, state: "idle", data_json: {}, human_handoff: false };
  }
  return data;
}

async function saveSession(phone: string, state: string, data_json: Record<string, unknown>, human_handoff = false) {
  await supabase.from("whatsapp_sessions").upsert({
    phone, state, data_json, human_handoff,
    updated_at: new Date().toISOString(),
  }, { onConflict: "phone" });
}

function nextDates(): { iso: string; label: string }[] {
  const out = [];
  const d = new Date();
  for (let i = 0; i < 5; i++) {
    const cur = new Date(d); cur.setDate(d.getDate() + i + 1);
    out.push({
      iso: cur.toISOString().slice(0, 10),
      label: cur.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }),
    });
  }
  return out;
}

async function freeSlots(barberId: string, dateIso: string): Promise<string[]> {
  const start = new Date(`${dateIso}T00:00:00`).toISOString();
  const end = new Date(`${dateIso}T23:59:59`).toISOString();
  const { data } = await supabase.from("appointments")
    .select("scheduled_at").eq("barber_id", barberId)
    .gte("scheduled_at", start).lte("scheduled_at", end).neq("status", "cancelled");
  const taken = new Set((data ?? []).map((r) => new Date(r.scheduled_at).toISOString()));
  const slots: string[] = [];
  for (let h = 9; h < 19; h++) {
    for (const m of [0, 30]) {
      const iso = new Date(`${dateIso}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`).toISOString();
      if (!taken.has(iso)) slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    }
  }
  return slots;
}

async function handleReminderReply(conv: { id: string }, phone: string, text: string): Promise<boolean> {
  const upper = text.trim().toUpperCase();
  const wantsConfirm = upper.includes("CONFIRMAR");
  const wantsCancel = upper.includes("CANCELAR");
  if (!wantsConfirm && !wantsCancel) return false;

  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);

  const { data: profile } = await supabase.from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (!profile) return false;

  const { data: appt } = await supabase.from("appointments")
    .select("id").eq("user_id", profile.id)
    .gte("scheduled_at", today.toISOString()).lt("scheduled_at", tomorrow.toISOString())
    .neq("status", "cancelled").order("scheduled_at").limit(1).maybeSingle();
  if (!appt) return false;

  if (wantsConfirm) {
    await supabase.from("appointments").update({ status: "confirmed", confirmed_by_whatsapp: true }).eq("id", appt.id);
    await sendAndLog(conv.id, phone, "✅ Presença confirmada! Te esperamos.");
  } else {
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", appt.id);
    await sendAndLog(conv.id, phone, `❌ Agendamento cancelado. Para reagendar acesse: ${PORTAL}`);
  }
  return true;
}

async function runBot(conv: { id: string }, phone: string, text: string) {
  const upper = text.trim().toUpperCase();
  let session = await getSession(phone);

  if (upper === "ATENDENTE") {
    await saveSession(phone, session?.state ?? "idle", session?.data_json as Record<string, unknown> ?? {}, true);
    await sendAndLog(conv.id, phone, "👤 Encaminhando para um atendente humano. Em breve alguém falará com você.");
    return;
  }
  if (session?.human_handoff) return;
  if (upper === "MENU" || !session || session.state === "idle") {
    await saveSession(phone, "menu", {});
    await sendAndLog(conv.id, phone, "Olá! 👋 Bem-vindo à *BarberPass*! 💈\n\nComo posso te ajudar?\n1️⃣ Agendar corte\n2️⃣ Ver meu agendamento\n3️⃣ Falar com atendente");
    return;
  }

  const data = (session.data_json as Record<string, unknown>) ?? {};

  switch (session.state) {
    case "menu": {
      if (text.trim() === "1") {
        await saveSession(phone, "ask_name", {});
        await sendAndLog(conv.id, phone, "Me informe seu nome completo:");
      } else if (text.trim() === "2") {
        const { data: profile } = await supabase.from("profiles").select("id, full_name").eq("phone", phone).maybeSingle();
        if (!profile) { await sendAndLog(conv.id, phone, "Não encontrei seu cadastro. Digite *1* para agendar."); break; }
        const today = new Date(); today.setHours(0,0,0,0);
        const { data: appt } = await supabase.from("appointments")
          .select("scheduled_at, service_type, status")
          .eq("user_id", profile.id).gte("scheduled_at", today.toISOString())
          .neq("status","cancelled").order("scheduled_at").limit(1).maybeSingle();
        if (!appt) await sendAndLog(conv.id, phone, "Você não tem agendamentos futuros. Digite *MENU* para começar.");
        else {
          const dt = new Date(appt.scheduled_at);
          await sendAndLog(conv.id, phone, `📅 Próximo agendamento:\n${dt.toLocaleDateString("pt-BR")} às ${dt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}\nStatus: ${appt.status}\n\nDigite *MENU* para outras opções.`);
        }
        await saveSession(phone, "idle", {});
      } else if (text.trim() === "3") {
        await saveSession(phone, "idle", {}, true);
        await sendAndLog(conv.id, phone, "👤 Encaminhando para um atendente. Em breve falaremos com você.");
      } else {
        await sendAndLog(conv.id, phone, "Digite *1*, *2* ou *3*.");
      }
      break;
    }
    case "ask_name": {
      const name = text.trim();
      const list = SERVICES.map((s, i) => `${i+1}️⃣ ${s.label} — R$${s.price}`).join("\n");
      await saveSession(phone, "ask_service", { name });
      await sendAndLog(conv.id, phone, `Que ótimo, ${name}! Qual serviço deseja?\n${list}`);
      break;
    }
    case "ask_service": {
      const idx = parseInt(text.trim(), 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= SERVICES.length) { await sendAndLog(conv.id, phone, "Escolha um número válido."); break; }
      const service = SERVICES[idx];
      const { data: barbers } = await supabase.from("barbers").select("id, full_name").eq("active", true).limit(1);
      const barber = barbers?.[0];
      if (!barber) { await sendAndLog(conv.id, phone, "Nenhum barbeiro disponível no momento. Tente mais tarde."); await saveSession(phone, "idle", {}); break; }
      const dates = nextDates();
      const lines = await Promise.all(dates.map(async (d, i) => {
        const free = await freeSlots(barber.id, d.iso);
        return `${i+1}️⃣ ${d.label} — ${free.length} horários`;
      }));
      await saveSession(phone, "ask_date", { ...data, service: service.id, serviceLabel: service.label, barberId: barber.id, barberName: barber.full_name, dates });
      await sendAndLog(conv.id, phone, `Perfeito! Escolha uma data disponível:\n${lines.join("\n")}`);
      break;
    }
    case "ask_date": {
      const idx = parseInt(text.trim(), 10) - 1;
      const dates = data.dates as { iso: string; label: string }[];
      if (!dates || isNaN(idx) || idx < 0 || idx >= dates.length) { await sendAndLog(conv.id, phone, "Escolha um número válido."); break; }
      const chosen = dates[idx];
      const slots = await freeSlots(data.barberId as string, chosen.iso);
      if (!slots.length) { await sendAndLog(conv.id, phone, "Sem horários nesta data. Escolha outra."); break; }
      const display = slots.slice(0, 12).map((s, i) => `${i+1}️⃣ ${s}`).join("  ");
      await saveSession(phone, "ask_time", { ...data, dateIso: chosen.iso, dateLabel: chosen.label, slots: slots.slice(0,12) });
      await sendAndLog(conv.id, phone, `Horários disponíveis para ${chosen.label}:\n${display}`);
      break;
    }
    case "ask_time": {
      const idx = parseInt(text.trim(), 10) - 1;
      const slots = data.slots as string[];
      if (!slots || isNaN(idx) || idx < 0 || idx >= slots.length) { await sendAndLog(conv.id, phone, "Escolha um número válido."); break; }
      const time = slots[idx];
      await saveSession(phone, "confirm", { ...data, time });
      await sendAndLog(conv.id, phone, `Confirma seu agendamento?\n📅 ${data.dateLabel} às ${time}\n✂️ Serviço: ${data.serviceLabel}\n\nResponda *SIM* para confirmar ou *NÃO* para cancelar.`);
      break;
    }
    case "confirm": {
      if (upper === "SIM") {
        // Find or create profile
        let { data: profile } = await supabase.from("profiles").select("id").eq("phone", phone).maybeSingle();
        if (!profile) {
          // Create pre-registration via auth admin (random email/password placeholder)
          const email = `wa_${phone}@barberpass.app`;
          const { data: created } = await supabase.auth.admin.createUser({
            email, email_confirm: true,
            password: crypto.randomUUID(),
            user_metadata: { full_name: data.name, phone },
          });
          if (created?.user) profile = { id: created.user.id };
        }
        if (!profile) { await sendAndLog(conv.id, phone, "Erro ao criar cadastro. Tente novamente mais tarde."); await saveSession(phone, "idle", {}); break; }

        const scheduled_at = new Date(`${data.dateIso}T${data.time}:00`).toISOString();
        const { data: appt, error } = await supabase.from("appointments").insert({
          user_id: profile.id, barber_id: data.barberId, service_type: data.service,
          scheduled_at, status: "confirmed", confirmed_by_whatsapp: true,
        }).select().single();
        if (error) { await sendAndLog(conv.id, phone, "Erro ao agendar. Tente novamente."); await saveSession(phone, "idle", {}); break; }

        await sendAndLog(conv.id, phone, `✅ *Agendamento realizado!*\n\nTe esperamos no dia ${data.dateLabel} às ${data.time}.\nPara gerenciar acesse: ${PORTAL}\n\nAté logo! 💈`);

        const { data: barber } = await supabase.from("barbers").select("phone").eq("id", data.barberId).single();
        if (barber?.phone) await sendWhatsApp(barber.phone, `📋 Novo agendamento (WhatsApp)\nCliente: ${data.name}\n${data.dateLabel} às ${data.time}\n${data.serviceLabel}`);

        await saveSession(phone, "idle", {});
      } else {
        await sendAndLog(conv.id, phone, "Tudo bem, agendamento não realizado. Digite *MENU* para recomeçar.");
        await saveSession(phone, "idle", {});
      }
      break;
    }
    default:
      await saveSession(phone, "idle", {});
      await sendAndLog(conv.id, phone, "Digite *MENU* para começar.");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const payload = await req.json().catch(() => ({}));
    // UazAPI webhook shapes vary; try common fields
    const msg = payload?.message ?? payload?.data ?? payload;
    const fromRaw: string = msg?.from ?? msg?.sender ?? msg?.chatid ?? msg?.phone ?? msg?.number ?? "";
    const text: string = msg?.text ?? msg?.body ?? msg?.message ?? msg?.content ?? "";
    const fromMe: boolean = !!(msg?.fromMe ?? msg?.fromme ?? msg?.from_me);
    if (!fromRaw || !text || fromMe) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const phone = normalizePhone(fromRaw);

    // Save inbound for debugging
    await supabase.from("whatsapp_sessions").upsert({
      phone, last_message: text, updated_at: new Date().toISOString(),
    }, { onConflict: "phone", ignoreDuplicates: false });

    // Conversation + inbound message
    const conv = await getOrCreateConversation(phone);
    await logMessage(conv.id, text, "client");

    // If a human has taken over, do not run the bot
    const { data: convNow } = await supabase.from("conversations").select("mode,status").eq("id", conv.id).single();
    if (convNow?.mode === "human") {
      return new Response(JSON.stringify({ ok: true, mode: "human" }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Try reminder reply first
    const handled = await handleReminderReply(conv, phone, text);
    if (!handled) await runBot(conv, phone, text);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    console.error("webhook error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});

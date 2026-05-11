import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWhatsAppText } from "./uazapi.server";

async function ensureAccess(userId: string, conversationId: string) {
  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  if (isAdmin) return;
  const { data: conv } = await supabaseAdmin.from("conversations").select("barber_id, client_id").eq("id", conversationId).single();
  if (!conv) throw new Error("Conversa não encontrada");
  const { data: barber } = await supabaseAdmin.from("barbers").select("id").eq("user_id", userId).maybeSingle();
  if (!barber) throw new Error("Sem permissão");
  if (conv.barber_id && conv.barber_id !== barber.id) throw new Error("Sem permissão");
}

export const sendAgentMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({
    conversationId: z.string().uuid(),
    body: z.string().min(1).max(4000),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await ensureAccess(userId, data.conversationId);

    const { data: conv } = await supabaseAdmin.from("conversations").select("phone, barber_id").eq("id", data.conversationId).single();
    if (!conv) throw new Error("Conversa não encontrada");

    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle();

    // Switch to human mode + assign barber if missing
    let barberId = conv.barber_id;
    if (!barberId) {
      const { data: b } = await supabaseAdmin.from("barbers").select("id").eq("user_id", userId).maybeSingle();
      barberId = b?.id ?? null;
    }
    await supabaseAdmin.from("conversations").update({
      mode: "human", status: "open", barber_id: barberId, unread_count: 0,
    }).eq("id", data.conversationId);

    await sendWhatsAppText(conv.phone, data.body);

    const { error } = await supabaseAdmin.from("messages").insert({
      conversation_id: data.conversationId,
      body: data.body,
      sender_type: "agent",
      sender_id: userId,
      sender_name: profile?.full_name ?? "Atendente",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setConversationMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({
    conversationId: z.string().uuid(),
    mode: z.enum(["bot", "human"]),
  }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAccess(context.userId, data.conversationId);
    await supabaseAdmin.from("conversations").update({ mode: data.mode }).eq("id", data.conversationId);
    await supabaseAdmin.from("messages").insert({
      conversation_id: data.conversationId,
      body: data.mode === "human" ? "Atendente assumiu a conversa" : "Conversa devolvida ao bot",
      sender_type: "system", sender_name: "Sistema",
    });
    return { ok: true };
  });

export const resolveConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ conversationId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAccess(context.userId, data.conversationId);
    await supabaseAdmin.from("conversations").update({ status: "resolved", mode: "bot" }).eq("id", data.conversationId);
    await supabaseAdmin.from("whatsapp_sessions").update({ state: "idle", data_json: {}, human_handoff: false })
      .eq("phone", (await supabaseAdmin.from("conversations").select("phone").eq("id", data.conversationId).single()).data!.phone);
    await supabaseAdmin.from("messages").insert({
      conversation_id: data.conversationId, body: "Conversa marcada como resolvida",
      sender_type: "system", sender_name: "Sistema",
    });
    return { ok: true };
  });

export const transferConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({
    conversationId: z.string().uuid(), barberId: z.string().uuid(),
  }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAccess(context.userId, data.conversationId);
    await supabaseAdmin.from("conversations").update({ barber_id: data.barberId, mode: "human" }).eq("id", data.conversationId);
    const { data: barber } = await supabaseAdmin.from("barbers").select("full_name").eq("id", data.barberId).single();
    await supabaseAdmin.from("messages").insert({
      conversation_id: data.conversationId,
      body: `Conversa transferida para ${barber?.full_name ?? "outro barbeiro"}`,
      sender_type: "system", sender_name: "Sistema",
    });
    return { ok: true };
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ conversationId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAccess(context.userId, data.conversationId);
    await supabaseAdmin.from("conversations").update({ unread_count: 0 }).eq("id", data.conversationId);
    return { ok: true };
  });

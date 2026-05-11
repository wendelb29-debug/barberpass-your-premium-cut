import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createAsaasCustomer, createAsaasSubscription, cancelAsaasSubscription } from "./asaas.server";

const subscribeSchema = z.object({
  planId: z.string().uuid(),
  billingType: z.enum(["PIX", "BOLETO", "CREDIT_CARD"]).default("PIX"),
  cpfCnpj: z.string().min(11).max(20).optional(),
});

export const subscribeToPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => subscribeSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("*").eq("id", userId).maybeSingle();
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;

    const { data: plan } = await supabaseAdmin.from("plans").select("*").eq("id", data.planId).single();
    if (!plan) throw new Error("Plano não encontrado");

    // 1. Ensure Asaas customer
    let customerId = profile?.asaas_customer_id;
    if (!customerId) {
      const customer = await createAsaasCustomer({
        name: profile?.full_name || email || "Cliente BarberPass",
        email,
        mobilePhone: profile?.phone ?? undefined,
        cpfCnpj: data.cpfCnpj,
        externalReference: userId,
      });
      customerId = customer.id as string;
      await supabaseAdmin.from("profiles").update({ asaas_customer_id: customerId }).eq("id", userId);
    }

    // 2. Cancel existing active subscriptions
    const { data: existing } = await supabaseAdmin
      .from("subscriptions").select("*").eq("user_id", userId).neq("status", "CANCELLED");
    for (const s of existing ?? []) {
      if (s.asaas_subscription_id) {
        try { await cancelAsaasSubscription(s.asaas_subscription_id); } catch (e) { console.error(e); }
      }
      await supabaseAdmin.from("subscriptions")
        .update({ status: "CANCELLED", cancelled_at: new Date().toISOString() }).eq("id", s.id);
    }

    // 3. Create new Asaas subscription
    const next = new Date(); next.setDate(next.getDate() + 1);
    const nextDue = next.toISOString().slice(0, 10);
    const sub = await createAsaasSubscription({
      customer: customerId!,
      billingType: data.billingType,
      value: plan.price_cents / 100,
      nextDueDate: nextDue,
      cycle: "MONTHLY",
      description: `BarberPass - ${plan.name}`,
      externalReference: userId,
    });

    const { data: row, error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      plan_id: plan.id,
      asaas_subscription_id: sub.id as string,
      status: "ACTIVE",
      billing_type: data.billingType,
      next_due_date: nextDue,
    }).select().single();
    if (error) throw new Error(error.message);

    return { subscriptionId: row.id, asaasSubscriptionId: sub.id as string };
  });

export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: subs } = await supabaseAdmin
      .from("subscriptions").select("*").eq("user_id", userId).neq("status", "CANCELLED");
    for (const s of subs ?? []) {
      if (s.asaas_subscription_id) {
        try { await cancelAsaasSubscription(s.asaas_subscription_id); } catch (e) { console.error(e); }
      }
      await supabaseAdmin.from("subscriptions")
        .update({ status: "CANCELLED", cancelled_at: new Date().toISOString() }).eq("id", s.id);
    }
    return { ok: true };
  });

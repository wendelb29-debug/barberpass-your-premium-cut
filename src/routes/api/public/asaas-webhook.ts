import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Asaas envia o token configurado pelo usuário no header `asaas-access-token`.
// Configure este endpoint em https://www.asaas.com/customerWebhookConfiguration/index
// URL: https://<seu-projeto>.lovable.app/api/public/asaas-webhook

interface AsaasEvent {
  event: string;
  payment?: {
    id: string;
    customer: string;
    subscription?: string;
    value: number;
    netValue?: number;
    status: string;
    dueDate: string;
    paymentDate?: string;
    invoiceUrl?: string;
    externalReference?: string;
  };
}

function mapPaymentStatus(s: string): string {
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(s)) return "PAID";
  if (s === "OVERDUE") return "OVERDUE";
  if (s === "REFUNDED") return "REFUNDED";
  if (s === "PENDING") return "PENDING";
  return s;
}

export const Route = createFileRoute("/api/public/asaas-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.ASAAS_WEBHOOK_TOKEN;
        if (expected) {
          const got = request.headers.get("asaas-access-token");
          if (got !== expected) return new Response("Unauthorized", { status: 401 });
        }

        let event: AsaasEvent;
        try { event = await request.json(); }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        const p = event.payment;
        if (!p) return new Response("ok");

        // Find subscription by asaas_subscription_id
        let subscriptionRow: { id: string; user_id: string } | null = null;
        if (p.subscription) {
          const { data } = await supabaseAdmin
            .from("subscriptions").select("id, user_id").eq("asaas_subscription_id", p.subscription).maybeSingle();
          subscriptionRow = data;
        }
        const userId = subscriptionRow?.user_id ?? p.externalReference;
        if (!userId) return new Response("ok");

        const status = mapPaymentStatus(p.status);

        // Upsert payment
        await supabaseAdmin.from("payments").upsert({
          asaas_payment_id: p.id,
          subscription_id: subscriptionRow?.id ?? null,
          user_id: userId,
          status,
          value_cents: Math.round(p.value * 100),
          due_date: p.dueDate,
          paid_at: p.paymentDate ? new Date(p.paymentDate).toISOString() : null,
          invoice_url: p.invoiceUrl ?? null,
        }, { onConflict: "asaas_payment_id" });

        // Update subscription status
        if (subscriptionRow) {
          let subStatus: string | null = null;
          if (event.event === "PAYMENT_RECEIVED" || event.event === "PAYMENT_CONFIRMED") subStatus = "ACTIVE";
          else if (event.event === "PAYMENT_OVERDUE") subStatus = "OVERDUE";
          else if (event.event === "PAYMENT_DELETED" || event.event === "SUBSCRIPTION_DELETED") subStatus = "CANCELLED";
          if (subStatus) {
            await supabaseAdmin.from("subscriptions").update({ status: subStatus }).eq("id", subscriptionRow.id);
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

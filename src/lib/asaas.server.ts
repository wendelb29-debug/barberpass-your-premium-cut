// Server-only Asaas API client. Never import from client code.
const ASAAS_BASE = process.env.ASAAS_ENV === "production"
  ? "https://api.asaas.com/v3"
  : "https://sandbox.asaas.com/api/v3";

function getKey() {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  return key;
}

async function asaasFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: getKey(),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    throw new Error(`Asaas ${res.status}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body as Record<string, unknown>;
}

export interface AsaasCustomerInput {
  name: string;
  cpfCnpj?: string;
  email?: string;
  mobilePhone?: string;
  externalReference?: string;
}

export async function createAsaasCustomer(input: AsaasCustomerInput) {
  return asaasFetch("/customers", { method: "POST", body: JSON.stringify(input) });
}

export interface AsaasSubscriptionInput {
  customer: string;
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD";
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: "MONTHLY" | "QUARTERLY" | "YEARLY";
  description?: string;
  externalReference?: string;
}

export async function createAsaasSubscription(input: AsaasSubscriptionInput) {
  return asaasFetch("/subscriptions", { method: "POST", body: JSON.stringify(input) });
}

export async function cancelAsaasSubscription(id: string) {
  return asaasFetch(`/subscriptions/${id}`, { method: "DELETE" });
}

export async function getAsaasPayment(id: string) {
  return asaasFetch(`/payments/${id}`, { method: "GET" });
}

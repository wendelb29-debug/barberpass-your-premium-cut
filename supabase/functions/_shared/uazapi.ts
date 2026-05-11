// Shared helpers for UazAPI WhatsApp integration
const URL = Deno.env.get("UAZAPI_URL");
const TOKEN = Deno.env.get("UAZAPI_TOKEN");
const INSTANCE = Deno.env.get("UAZAPI_INSTANCE");

export function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function sendWhatsApp(phone: string, text: string) {
  if (!URL || !TOKEN) {
    console.warn("UazAPI not configured");
    return { ok: false, skipped: true };
  }
  const number = normalizePhone(phone);
  if (!number) return { ok: false, error: "no phone" };

  try {
    const res = await fetch(`${URL.replace(/\/$/, "")}/send/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: TOKEN,
        ...(INSTANCE ? { instance: INSTANCE } : {}),
      },
      body: JSON.stringify({ number, text }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("UazAPI error", res.status, body);
      return { ok: false, status: res.status, body };
    }
    return { ok: true };
  } catch (e) {
    console.error("UazAPI exception", e);
    return { ok: false, error: String(e) };
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

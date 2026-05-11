// Server-only UazAPI client used by server functions.
const URL_ = process.env.UAZAPI_URL;
const TOKEN = process.env.UAZAPI_TOKEN;
const INSTANCE = process.env.UAZAPI_INSTANCE;

export function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function sendWhatsAppText(phone: string, text: string) {
  if (!URL_ || !TOKEN) return { ok: false, skipped: true };
  const number = normalizePhone(phone);
  if (!number) return { ok: false, error: "no phone" };
  const res = await fetch(`${URL_.replace(/\/$/, "")}/send/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: TOKEN,
      ...(INSTANCE ? { instance: INSTANCE } : {}),
    },
    body: JSON.stringify({ number, text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, body };
  }
  return { ok: true };
}

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

const TOLERANCE_S = 5 * 60;

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Standard Webhooks: HMAC-SHA256 over `${id}.${timestamp}.${body}`, header "v1,<base64> v1,<base64>". */
async function verifyWebhook(secret: string, req: Request, body: string): Promise<boolean> {
  const id = req.headers.get("webhook-id");
  const timestamp = req.headers.get("webhook-timestamp");
  const signature = req.headers.get("webhook-signature");
  if (!id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_S) return false;
  let keyBytes: Uint8Array<ArrayBuffer>;
  try {
    keyBytes = b64ToBytes(secret.replace(/^(whsec_|ws_)/, ""));
  } catch {
    console.warn("whop webhook: WHOP_WEBHOOK_SECRET is not valid base64");
    return false;
  }
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  const expected = bytesToB64(new Uint8Array(mac));
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    return version === "v1" && !!sig && safeEqual(sig, expected);
  });
}

/** Whop webhook: payment succeeded / membership activated -> household becomes Kin Plus. */
http.route({
  path: "/whop",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const raw = await req.text();
    const secret = process.env.WHOP_WEBHOOK_SECRET;
    if (!secret) {
      console.warn("whop webhook: WHOP_WEBHOOK_SECRET is not set, skipping signature verification");
    } else if (!(await verifyWebhook(secret, req, raw))) {
      return new Response("invalid signature", { status: 401 });
    }
    let body: any = {};
    try {
      body = JSON.parse(raw);
    } catch {
      return new Response("bad json", { status: 400 });
    }
    const type: string = body?.type ?? body?.action ?? "";
    const data = body?.data ?? {};
    const meta = data?.metadata ?? data?.checkout_configuration?.metadata ?? data?.membership?.metadata ?? {};
    if (/payment\.succeeded|payment_succeeded|membership\.(activated|went_valid)/.test(type) && meta?.householdId) {
      await ctx.runMutation(internal.whop.markPlus, { householdId: String(meta.householdId) });
    }
    return new Response("ok", { status: 200 });
  }),
});

export default http;

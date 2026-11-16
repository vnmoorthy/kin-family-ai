import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/** Whop webhook: payment succeeded / membership activated -> household becomes Kin Plus. */
http.route({
  path: "/whop",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    let body: any = {};
    try {
      body = await req.json();
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

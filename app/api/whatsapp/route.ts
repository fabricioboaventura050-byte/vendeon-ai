
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    return new NextResponse("Servidor não configurado", {
      status: 503,
    });
  }

  if (
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === verifyToken
  ) {
    return new NextResponse(params.get("hub.challenge") ?? "", {
      status: 200,
    });
  }

  return new NextResponse("Verificação inválida", {
    status: 403,
  });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!appSecret || !supabaseUrl || !serviceKey) {
    return new NextResponse("Servidor não configurado", {
      status: 503,
    });
  }

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
console.log("Diagnóstico WhatsApp:", {
  assinaturaPresente: Boolean(signature),
  formatoSha256: signature?.startsWith("sha256=") ?? false,
  appSecretConfigurado: Boolean(appSecret),
});
  if (!signature?.startsWith("sha256=")) {
    return new NextResponse("Assinatura ausente", {
      status: 401,
    });
  }

  const receivedHex = signature.slice(7);

  if (!/^[a-fA-F0-9]{64}$/.test(receivedHex)) {
    return new NextResponse("Assinatura inválida", {
      status: 401,
    });
  }

  const expected = createHmac("sha256", appSecret)
    .update(body, "utf8")
    .digest();

  const received = Buffer.from(receivedHex, "hex");

  if (!timingSafeEqual(expected, received)) {
    return new NextResponse("Assinatura inválida", {
      status: 401,
    });
  }

  let payload: any;

  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse("JSON inválido", { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account") {
    return NextResponse.json({ received: true });
  }

  const messages: {
    message_id: string;
    phone_number: string;
    contact_name: string | null;
    message_text: string | null;
    direction: string;
  }[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const value = change.value ?? {};
      const contacts = value.contacts ?? [];

      for (const message of value.messages ?? []) {
        if (!message.id || !message.from) continue;

        const contact = contacts.find(
          (item: any) => item.wa_id === message.from
        );

        messages.push({
          message_id: message.id,
          phone_number: message.from,
          contact_name: contact?.profile?.name ?? null,
          message_text:
            message.type === "text"
              ? message.text?.body ?? null
              : `[${message.type ?? "unknown"}]`,
          direction: "incoming",
        });
      }
    }
  }

  if (messages.length === 0) {
    return NextResponse.json({ received: true });
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/whatsapp_messages?on_conflict=message_id`,
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify(messages),
    }
  );

  if (!response.ok) {
    console.error("Erro ao salvar mensagens:", response.status);
    return new NextResponse("Erro ao armazenar mensagens", {
      status: 500,
    });
  }

  return NextResponse.json({ received: true });
}

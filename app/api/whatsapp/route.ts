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

  if (!appSecret) {
    return new NextResponse("Servidor não configurado", {
      status: 503,
    });
  }

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!signature?.startsWith("sha256=")) {
    return new NextResponse("Assinatura ausente", {
      status: 401,
    });
  }

  const expected = createHmac("sha256", appSecret)
    .update(body, "utf8")
    .digest();

  const receivedHex = signature.slice(7);

  if (!/^[a-fA-F0-9]{64}$/.test(receivedHex)) {
    return new NextResponse("Assinatura inválida", {
      status: 401,
    });
  }

  const received = Buffer.from(receivedHex, "hex");

  if (!timingSafeEqual(expected, received)) {
    return new NextResponse("Assinatura inválida", {
      status: 401,
    });
  }

  // Assinatura validada. O processamento e armazenamento
  // das mensagens serão implementados na próxima etapa.
  return NextResponse.json({ received: true });
}

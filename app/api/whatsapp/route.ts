
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    return new NextResponse("Servidor não configurado", {
      status: 503,
    });
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return new NextResponse("Verificação inválida", {
    status: 403,
  });
}

export async function POST(request: NextRequest) {
  // A validação da assinatura da Meta será adicionada
  // antes de habilitar o recebimento de mensagens reais.
  return NextResponse.json(
    { error: "Webhook ainda não ativado" },
    { status: 503 }
  );
}

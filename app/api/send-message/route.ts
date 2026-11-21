import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.match(/^Bearer (.+)$/i)?.[1];

    if (!token) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const ownerId = process.env.VENDEON_OWNER_UID;
    const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!url || !anonKey || !ownerId || !whatsappToken || !phoneId) {
      return NextResponse.json(
        { error: "Configuração incompleta" },
        { status: 503 }
      );
    }

    const supabase = createClient(url, anonKey);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Sessão inválida" },
        { status: 401 }
      );
    }

    if (data.user.id !== ownerId) {
      return NextResponse.json(
        { error: "Acesso não permitido" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const to = body?.to;
    const message = body?.text;

    if (
      typeof to !== "string" ||
      !/^\d{8,15}$/.test(to) ||
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 4096
    ) {
      return NextResponse.json(
        { error: "Número ou mensagem inválida" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body: message.trim() },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Falha no envio pelo WhatsApp" },
        { status: 502 }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      messageId: result.messages?.[0]?.id ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

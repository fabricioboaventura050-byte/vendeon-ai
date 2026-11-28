
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Chave da IA ainda não configurada." },
        { status: 503 }
      );
    }

    const { message } = await req.json();

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Mensagem inválida." },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Você é o assistente de vendas da VENDEON AI. " +
                "Responda em português brasileiro, de forma " +
                "educada, clara e objetiva. Ajude os clientes " +
                "com dúvidas sobre produtos e vendas. " +
                "Nunca invente preços, estoques ou promoções. " +
                "Se não souber algo, informe que precisa " +
                "consultar a empresa.",
            },
            {
              role: "user",
              content: message.trim(),
            },
          ],
          max_tokens: 300,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Não foi possível gerar a resposta." },
        { status: 502 }
      );
    }

    const reply = data.choices?.[0]?.message?.content;

    return NextResponse.json({ reply: reply || "" });
  } catch {
    return NextResponse.json(
      { error: "Erro ao processar a mensagem." },
      { status: 500 }
    );
  }
}

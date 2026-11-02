import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Configuração incompleta" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data: auth, error: authError } =
    await supabase.auth.getUser(token);

  if (authError || !auth.user) {
    return NextResponse.json(
      { error: "Sessão inválida" },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: "Não foi possível buscar mensagens" },
      { status: 500 }
    );
  }

  return NextResponse.json({ messages: data ?? [] });
}

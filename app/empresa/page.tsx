
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EmpresaPage() {
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAutenticado(!!data.user);
      setVerificando(false);
    });
  }, []);

  async function criarEmpresa(e: React.FormEvent) {
    e.preventDefault();

    if (!nome.trim()) return;

    setCarregando(true);
    setMensagem("");

    const { data, error } = await supabase.rpc(
      "create_company",
      { company_name: nome.trim() }
    );

    setCarregando(false);

    if (error) {
      setMensagem("Erro: " + error.message);
      return;
    }

    setMensagem("Empresa cadastrada com sucesso!");
    setNome("");
    console.log("Empresa criada:", data);
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f5f7f8",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      fontFamily: "Arial, sans-serif"
    }}>
      <section style={{
        background: "#fff",
        borderRadius: 16,
        padding: 30,
        maxWidth: 420,
        width: "100%",
        boxShadow: "0 8px 30px #00000012"
      }}>
        <h1 style={{ color: "#15966b" }}>
          VENDEON AI
        </h1>

        <h2>Cadastrar empresa</h2>

        {verificando ? (
          <p>Verificando sua conta...</p>
        ) : !autenticado ? (
          <>
            <p>Entre na sua conta para continuar.</p>
            <a href="/">Fazer login</a>
          </>
        ) : (
          <form onSubmit={criarEmpresa}>
            <label htmlFor="nomeEmpresa">
              Nome da empresa
            </label>

            <input
              id="nomeEmpresa"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome da empresa"
              maxLength={120}
              required
              style={{
                width: "100%",
                padding: 12,
                marginTop: 10,
                marginBottom: 18,
                border: "1px solid #ddd",
                borderRadius: 8,
                boxSizing: "border-box"
              }}
            />

            <button
              type="submit"
              disabled={carregando}
              style={{
                width: "100%",
                padding: 14,
                background: "#15966b",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                cursor: "pointer"
              }}
            >
              {carregando
                ? "Cadastrando..."
                : "Criar empresa"}
            </button>
          </form>
        )}

        {mensagem && <p role="status">{mensagem}</p>}

        <p>
          <a href="/">Voltar ao painel</a>
        </p>
      </section>
    </main>
  );
}

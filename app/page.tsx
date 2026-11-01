"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

type Lead = { id: string; name: string; email: string | null; phone: string | null; stage: string; interest: string | null; value: number };
type Product = { id: string; name: string; description: string | null; price: number; active: boolean };
type ChatMessage = { id: number; from: "client" | "agent"; text: string; time: string };
type Conversation = { id: number; name: string; phone: string; preview: string; time: string; unread: number; messages: ChatMessage[] };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabase: SupabaseClient | null = null;
if (url && anon) supabase = createClient(url, anon);

const initialConversations: Conversation[] = [
  { id: 1, name: "Mariana Costa", phone: "(13) 99999-1234", preview: "Vocês entregam na minha região?", time: "10:42", unread: 2, messages: [
    { id: 1, from: "client", text: "Olá! Tudo bem? Gostaria de saber mais sobre os produtos.", time: "10:39" },
    { id: 2, from: "agent", text: "Olá, Mariana! 😊 Tudo ótimo. Seja bem-vinda! Como posso ajudar?", time: "10:40" },
    { id: 3, from: "client", text: "Vocês entregam na minha região?", time: "10:42" }
  ]},
  { id: 2, name: "Rafael Mendes", phone: "(11) 98888-4321", preview: "Obrigado pelo atendimento!", time: "Ontem", unread: 0, messages: [
    { id: 4, from: "client", text: "Qual é o prazo de entrega?", time: "Ontem" },
    { id: 5, from: "agent", text: "O prazo depende do seu CEP. Se me informar, verifico para você.", time: "Ontem" },
    { id: 6, from: "client", text: "Obrigado pelo atendimento!", time: "Ontem" }
  ]},
  { id: 3, name: "Camila Oliveira", phone: "(21) 97777-5678", preview: "Pode me enviar o catálogo?", time: "Seg", unread: 0, messages: [
    { id: 7, from: "client", text: "Oi! Pode me enviar o catálogo?", time: "Seg" }
  ]}
];

const navItems = [
  { id: "inbox", label: "Caixa de entrada", icon: "▤" },
  { id: "automation", label: "Automações", icon: "✧" },
  { id: "contacts", label: "Contatos", icon: "♙" },
  { id: "knowledge", label: "Produtos e respostas", icon: "▣" },
  { id: "settings", label: "Configurações", icon: "⚙" }
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("inbox");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [conversations, setConversations] = useState(initialConversations);
  const [activeChat, setActiveChat] = useState(1);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productDescription, setProductDescription] = useState("");

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  async function loadData() {
    if (!supabase) return;
    const [l, p] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("created_at", { ascending: false })
    ]);
    if (!l.error) setLeads((l.data || []) as Lead[]);
    if (!p.error) setProducts((p.data || []) as Product[]);
  }

  useEffect(() => { if (user) loadData(); }, [user]);

  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage("");
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { data: { company_name: company || "Minha empresa" } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("Cadastro recebido! Verifique seu e-mail para confirmar a conta.");
    else setMessage("Acesso realizado.");
  }

  async function signout() {
    await supabase?.auth.signOut();
    setLeads([]); setProducts([]);
  }

  const activeConversation = conversations.find(c => c.id === activeChat) ?? conversations[0];
  const filteredConversations = useMemo(() => conversations.filter(c =>
    `${c.name} ${c.phone} ${c.preview}`.toLowerCase().includes(search.toLowerCase())
  ), [conversations, search]);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeConversation) return;
    const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setConversations(current => current.map(c => c.id === activeChat ? {
      ...c, preview: draft, time: now,
      messages: [...c.messages, { id: Date.now(), from: "agent", text: draft.trim(), time: now }]
    } : c));
    setDraft("");
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from("products").insert({
      name: productName, description: productDescription || null, price: Number(productPrice) || 0, active: true
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setProductName(""); setProductPrice(""); setProductDescription("");
      setMessage("Produto adicionado à sua base de conhecimento."); loadData();
    }
  }

  if (loading) return <main className="auth-screen"><div className="auth-card">Carregando VENDEON AI...</div></main>;

  if (!supabase) return <main className="auth-screen"><section className="auth-card">
    <div className="brand"><span className="brand-mark">V</span><b>VENDEON<span> AI</span></b></div>
    <h1>Vamos conectar sua plataforma</h1>
    <p>As variáveis do Supabase ainda não foram encontradas. Confira NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel.</p>
    <a className="primary-btn" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Abrir Supabase ↗</a>
  </section></main>;

  if (!user) return <main className="auth-screen"><section className="auth-card">
    <div className="brand"><span className="brand-mark">V</span><b>VENDEON<span> AI</span></b></div>
    <div className="eyebrow">ATENDIMENTO INTELIGENTE</div>
    <h1>{mode === "signup" ? "Crie sua conta" : "Bem-vindo de volta"}</h1>
    <p className="muted">Organize suas conversas e prepare seu atendimento com inteligência artificial.</p>
    <form className="auth-form" onSubmit={authenticate}>
      {mode === "signup" && <label>Nome da empresa<input value={company} onChange={e => setCompany(e.target.value)} placeholder="Minha empresa" /></label>}
      <label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com" /></label>
      <label>Senha<input type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" /></label>
      <button className="primary-btn" disabled={busy}>{busy ? "Aguarde..." : mode === "signup" ? "Criar conta" : "Entrar"}</button>
    </form>
    <button className="text-btn" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(""); }}>
      {mode === "signup" ? "Já tenho uma conta — entrar" : "Criar uma conta"}
    </button>
    {message && <p className="form-message">{message}</p>}
  </section></main>;

  const title = navItems.find(n => n.id === tab)?.label ?? "Caixa de entrada";

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">V</span><b>VENDEON<span> AI</span></b></div>
      <div className="workspace"><span className="workspace-dot" /><div><small>ESPAÇO DE TRABALHO</small><strong>{user.user_metadata.company_name || "Minha empresa"}</strong></div><span className="chevron">⌄</span></div>
      <div className="nav-caption">MENU PRINCIPAL</div>
      <nav>{navItems.map(item => <button key={item.id} className={`nav-item ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}{item.id === "inbox" && <em>3</em>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="connection-mini"><span className="status-dot offline" /><div><b>WhatsApp não conectado</b><small>Conecte sua conta para começar</small></div></div>
        <button className="profile" onClick={signout}><span className="avatar">{(user.email || "U").slice(0,1).toUpperCase()}</span><span><b>{user.email}</b><small>Sair da conta</small></span><span className="profile-more">⋯</span></button>
      </div>
    </aside>

    <section className="main-area">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">V</span><b>VENDEON<span> AI</span></b></div><div className="breadcrumb">Workspace <span>/</span> <b>{title}</b></div><div className="top-actions"><span className="plan-pill">PLANO INICIAL</span><button className="icon-btn" aria-label="Notificações">♧</button><span className="avatar small-avatar">{(user.email || "U").slice(0,1).toUpperCase()}</span></div></header>

      {message && <div className="global-message">{message}<button onClick={() => setMessage("")}>×</button></div>}

      {tab === "inbox" && <div className="inbox-page">
        <div className="page-heading"><div><div className="eyebrow">CENTRAL DE ATENDIMENTO</div><h1>Caixa de entrada</h1><p>Gerencie suas conversas em um só lugar.</p></div><button className="connect-btn" onClick={() => setTab("settings")}>＋ Conectar WhatsApp</button></div>
        <div className="inbox-layout">
          <section className="conversation-panel">
            <div className="conversation-head"><b>Conversas</b><span className="count-pill">{conversations.length}</span><button className="subtle-icon" aria-label="Mais opções">•••</button></div>
            <div className="search-box"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conversa..." /></div>
            <div className="filter-row"><button className="filter active-filter">Todas</button><button className="filter">Não lidas</button><button className="filter">Abertas</button></div>
            <div className="conversation-list">{filteredConversations.map(c => <button key={c.id} className={`conversation ${activeChat === c.id ? "selected" : ""}`} onClick={() => setActiveChat(c.id)}>
              <span className="contact-avatar">{c.name.split(" ").map(x => x[0]).slice(0,2).join("")}</span><span className="conversation-info"><span className="conversation-line"><b>{c.name}</b><small>{c.time}</small></span><span className="conversation-line"><span>{c.preview}</span>{c.unread > 0 && <em>{c.unread}</em>}</span></span>
            </button>)}{filteredConversations.length === 0 && <div className="empty-state">Nenhuma conversa encontrada.</div>}</div>
            <div className="demo-note">Demonstração visual · conversas fictícias</div>
          </section>
          <section className="chat-panel">
            {activeConversation ? <>
              <div className="chat-header"><span className="contact-avatar">{activeConversation.name.split(" ").map(x => x[0]).slice(0,2).join("")}</span><div><b>{activeConversation.name}</b><small>{activeConversation.phone} · conversa de demonstração</small></div><button className="subtle-icon chat-menu">•••</button></div>
              <div className="chat-body"><div className="date-chip">Hoje</div>{activeConversation.messages.map(m => <div key={m.id} className={`message-row ${m.from === "agent" ? "outgoing" : "incoming"}`}><div className="chat-bubble">{m.text}<small>{m.time} {m.from === "agent" ? "✓✓" : ""}</small></div></div>)}</div>
              <form className="composer" onSubmit={sendMessage}><button type="button" className="attach-btn" aria-label="Anexar">＋</button><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Digite uma mensagem..." /><button className="send-btn" disabled={!draft.trim()} aria-label="Enviar mensagem">➤</button></form>
              <div className="demo-warning">Prévia: enviar aqui não envia mensagens pelo WhatsApp real.</div>
            </> : <div className="empty-state">Selecione uma conversa.</div>}
          </section>
          <aside className="details-panel"><div className="details-title">Atendimento com IA</div><div className="ai-card"><span className="ai-spark">✧</span><b>Agente VENDEON</b><p>Seu assistente poderá responder clientes automaticamente quando a integração estiver configurada.</p><span className="status-label"><i className="status-dot offline" /> Desativado</span><button className="outline-btn" onClick={() => setTab("automation")}>Configurar agente</button></div><div className="details-title second-title">Detalhes do contato</div><div className="contact-detail"><span className="contact-avatar large">{activeConversation?.name.split(" ").map(x => x[0]).slice(0,2).join("") || "?"}</span><b>{activeConversation?.name || "Contato"}</b><small>{activeConversation?.phone || ""}</small><span className="detail-tag">Novo contato</span></div></aside>
        </div>
      </div>}

      {tab === "automation" && <div className="standard-page"><div className="page-heading"><div><div className="eyebrow">INTELIGÊNCIA ARTIFICIAL</div><h1>Automações</h1><p>Configure como o assistente deve atender seus clientes.</p></div></div><div className="settings-grid"><section className="surface-card"><div className="card-top"><span className="feature-icon">✧</span><span className="status-label"><i className={`status-dot ${aiEnabled ? "online" : "offline"}`} />{aiEnabled ? "Ativado na prévia" : "Desativado"}</span></div><h2>Atendente com IA</h2><p>Prepare as regras e o comportamento do seu assistente. A ativação real depende da conexão com WhatsApp e de um provedor de IA no servidor.</p><label className="toggle-line"><span><b>Atendimento automático</b><small>Controle visual de demonstração</small></span><input type="checkbox" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} /></label></section><section className="surface-card"><span className="feature-icon">☷</span><h2>Instruções do atendente</h2><p>Exemplo de orientação: seja educado, responda em português e pergunte como pode ajudar antes de oferecer um produto.</p><div className="info-box">A configuração das instruções será salva quando conectarmos o serviço de IA.</div></section></div></div>}

      {tab === "contacts" && <div className="standard-page"><div className="page-heading"><div><div className="eyebrow">RELACIONAMENTO</div><h1>Contatos</h1><p>Clientes cadastrados no seu espaço de trabalho.</p></div></div><section className="surface-card"><div className="table-wrap"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Etapa</th></tr></thead><tbody>{leads.map(l => <tr key={l.id}><td><b>{l.name}</b></td><td>{l.email || "—"}</td><td>{l.phone || "—"}</td><td><span className="detail-tag">{l.stage}</span></td></tr>)}{leads.length === 0 && <tr><td colSpan={4} className="empty-state">Seus contatos aparecerão aqui quando forem cadastrados.</td></tr>}</tbody></table></div></section></div>}

      {tab === "knowledge" && <div className="standard-page"><div className="page-heading"><div><div className="eyebrow">BASE DE CONHECIMENTO</div><h1>Produtos e respostas</h1><p>Cadastre informações para preparar o atendimento da IA.</p></div></div><section className="surface-card"><h2>Adicionar produto ou serviço</h2><form className="product-form" onSubmit={addProduct}><input required value={productName} onChange={e => setProductName(e.target.value)} placeholder="Nome do produto ou serviço" /><input type="number" min="0" step=".01" required value={productPrice} onChange={e => setProductPrice(e.target.value)} placeholder="Preço (R$)" /><input value={productDescription} onChange={e => setProductDescription(e.target.value)} placeholder="Descrição (opcional)" /><button className="connect-btn" disabled={busy}>Salvar informação</button></form><div className="table-wrap"><table><thead><tr><th>Produto</th><th>Descrição</th><th>Preço</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><b>{p.name}</b></td><td>{p.description || "—"}</td><td>{Number(p.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>)}{products.length === 0 && <tr><td colSpan={3} className="empty-state">Nenhum produto cadastrado.</td></tr>}</tbody></table></div></section></div>}

      {tab === "settings" && <div className="standard-page"><div className="page-heading"><div><div className="eyebrow">CANAIS E PREFERÊNCIAS</div><h1>Configurações</h1><p>Gerencie as conexões do seu atendimento.</p></div></div><section className="surface-card integration-card"><div className="integration-logo">◉</div><div className="integration-copy"><span className="status-label"><i className="status-dot offline" /> Não conectado</span><h2>WhatsApp Business Platform</h2><p>Para receber e responder mensagens reais, será necessário conectar uma conta do WhatsApp Business pela plataforma oficial da Meta, configurar webhooks e credenciais seguras no servidor.</p><a className="text-link" href="https://developers.facebook.com/docs/whatsapp/cloud-api/" target="_blank" rel="noreferrer">Consultar documentação oficial da Meta ↗</a></div><button className="outline-btn" onClick={() => setMessage("A conexão será configurada na próxima etapa. Não cole tokens ou chaves secretas aqui.")}>Preparar conexão</button></section><section className="surface-card account-card"><h2>Conta</h2><p>{user.email}</p><button className="outline-btn" onClick={signout}>Sair da conta</button></section></div>}

      <footer className="footer">VENDEON AI <span>•</span> Central de atendimento · Prévia de interface</footer>
    </section>
  </main>;
                                                                        }

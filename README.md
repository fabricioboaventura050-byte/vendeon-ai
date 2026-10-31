# Vendeon AI — base online (MVP 0.2)

Projeto inicial Next.js + Supabase, preparado para publicar em um endereço gratuito `*.vercel.app`.

## O que esta versão faz
- Cadastro e login de usuários via Supabase Auth.
- Cria uma organização e associação de proprietário quando um usuário se cadastra.
- CRM com cadastro de leads, etapas do funil e indicadores.
- Catálogo de produtos.
- Estrutura de banco multiempresa com Row Level Security (RLS).
- Interface responsiva em preto, branco e roxo.

## Publicação gratuita — passo a passo

### 1. Criar o banco Supabase
1. Acesse https://supabase.com e crie uma conta/projeto no plano Free.
2. No painel do projeto, abra **SQL Editor**.
3. Cole e execute todo o conteúdo de `supabase/schema.sql`.
4. Em **Project Settings → API**, copie a **Project URL** e a chave **anon/public**.
5. Em **Authentication → URL Configuration**, configure a URL do site depois que a Vercel gerar o endereço. Para testes locais, adicione `http://localhost:3000`.

### 2. Publicar na Vercel
1. Crie uma conta em https://vercel.com.
2. Coloque esta pasta em um repositório GitHub (ou importe o ZIP para seu computador e envie os arquivos).
3. Na Vercel, escolha **Add New → Project** e importe o repositório.
4. Em **Environment Variables**, configure:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL do Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = chave anon/public do Supabase
5. Clique em **Deploy**. A Vercel fornecerá um endereço gratuito `seu-projeto.vercel.app`.
6. Volte ao Supabase → Authentication → URL Configuration e defina o endereço da Vercel como Site URL e também em Redirect URLs.

### 3. Testar
- Abra o endereço publicado.
- Crie uma conta com e-mail e senha.
- Se a confirmação de e-mail estiver ativa, confirme pelo e-mail antes de entrar.
- Cadastre produtos e clientes e teste o funil.
- Crie uma segunda conta para validar que os dados de uma empresa não aparecem para a outra.

## Segurança e limites desta versão
- Use somente a chave `anon/public` no navegador. **Nunca** coloque `service_role` ou segredos de IA em variáveis `NEXT_PUBLIC_`.
- RLS limita produtos e leads à organização associada ao usuário.
- Este é um MVP inicial; antes de uso comercial, revise políticas e fluxos de convite/usuários, faça testes de segurança e configure backups.
- O agente de IA, WhatsApp/Instagram, automações, pagamentos/assinaturas, painel de superadministrador e gestão de planos ainda não estão conectados.
- O plano gratuito de terceiros tem limites e pode mudar. O endereço `vercel.app` é gratuito; domínio próprio é opcional e normalmente pago.
- Nome Vendeon AI é provisório; disponibilidade de marca/domínio não foi verificada.

## Rodar localmente
```bash
npm install
cp .env.example .env.local
# preencha as duas variáveis do Supabase
npm run dev
```
Abra http://localhost:3000.

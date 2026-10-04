# 📊 Fluxo de Caixa & Gestão Patrimonial

Aplicação moderna e profissional de **Gestão Financeira Pessoal e Patrimonial**, desenvolvida com **Next.js (App Router)**, **React 19**, **TypeScript** e **Prisma ORM** com banco de dados estruturado (SQLite local / PostgreSQL na nuvem).

Construída para substituir a lentidão do Google Apps Script por um site rápido, seguro, responsivo e com custo zero de hospedagem.

---

## 🚀 Tecnologias

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Lucide Icons, Gráficos SVG interativos e Google Charts.
- **Backend:** Next.js API Routes (`/api/auth`, `/api/lancamentos`, `/api/investimentos`, `/api/importar`).
- **Banco de Dados & ORM:** Prisma ORM com SQLite (ambiente local) e preparado para PostgreSQL / Supabase / Neon na nuvem.
- **Autenticação:** JWT com cookies HTTP-only e senhas criptografadas com `bcryptjs`.
- **Migração:** Importador nativo de CSV do Google Sheets com validação e limpeza automática.

---

## 🔑 Acesso ao Sistema

O banco de dados já vem configurado com os dois usuários do sistema:

| Usuário | Senha Inicial | Nível |
| :--- | :--- | :--- |
| `leandrob` | `Lek002**` | Administrador |
| `jipsyab` | `toy02sushi02` | Administrador |

---

## 🛠️ Comandos Principais

```bash
# Iniciar o servidor de desenvolvimento
npm run dev

# Abrir o Prisma Studio (interface visual para editar o banco de dados diretamente)
npm run db:studio

# Aplicar mudanças no banco de dados
npm run db:push

# Executar seed inicial de dados e usuários
npm run db:seed

# Compilar para produção
npm run build
```

O sistema roda por padrão em `http://localhost:3000`.

---

## 📥 Como Importar o seu estudo do Google Sheets

1. Abra sua planilha no Google Sheets (aba de fluxo de caixa ou de investimentos).
2. Vá em **Arquivo > Fazer download > Valores separados por vírgula (.csv)**.
3. No site, clique no botão superior **"Importar Planilha"**.
4. Selecione se é **Lançamentos** ou **Investimentos**.
5. Selecione o arquivo CSV (ou cole o texto copiado da planilha).
6. Clique em **Importar para o Banco de Dados**. Todos os lançamentos serão normalizados e gravados instantaneamente no banco de dados!

---

## ☁️ Como Colocar no Ar (Deploy 100% Gratuito)

1. **Repositório:** Envie este projeto para o seu GitHub (público ou privado).
2. **Banco na Nuvem (PostgreSQL):**
   - Crie uma conta gratuita no [Supabase](https://supabase.com) ou [Neon](https://neon.tech).
   - Copie a string de conexão (`DATABASE_URL=postgresql://...`).
3. **Deploy na Vercel:**
   - Conecte o repositório na [Vercel](https://vercel.com).
   - Em *Environment Variables*, adicione:
     - `DATABASE_URL`: URL do seu banco Supabase/Neon.
     - `JWT_SECRET`: uma chave secreta para as sessões.
   - Clique em **Deploy**! O site estará online com HTTPS e link exclusivo.

# SONAR

Sistema SONAR para apoio a processos logisticos, acompanhamento operacional e consulta assistida por IA.

## Tecnologias

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- OpenAI API

## Desenvolvimento local

```bash
npm install
npm run dev
```

Depois acesse:

```text
http://localhost:3000
```

## Variaveis de ambiente

Crie um arquivo `.env.local` com base em `.env.example`.

Principais variaveis:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SONAR_OPENAI_API_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=
```

## Deploy

O projeto pode ser publicado na Vercel conectado a um repositorio GitHub.

No painel da Vercel, configure as mesmas variaveis de ambiente usadas no `.env.local`, sem subir o arquivo `.env.local` para o GitHub.

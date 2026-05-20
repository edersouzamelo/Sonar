# Instruções de Configuração RADAR Cloud (Supabase)

Para ativar a sincronia em nuvem, siga estes passos:

## 1. Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com/) e crie uma conta gratuita.
2. Crie um novo projeto chamado "RADAR".
3. Aguarde o banco de dados ser provisionado.

## 2. Inicializar o Banco de Dados
1. No painel do Supabase, vá em **SQL Editor**.
2. Clique em **New Query**.
3. Copie todo o conteúdo do arquivo `supabase_init.sql` (que acabei de criar na pasta raiz do projeto) e cole no editor.
4. Clique em **Run**. Isso criará todas as tabelas e políticas de segurança.

## 3. Configurar Credenciais no RADAR
1. Vá em **Project Settings** > **API**.
2. Copie a **Project URL** e a **anon public API key**.
3. No seu computador, abra a pasta do projeto `radar`.
4. Crie um arquivo chamado `.env.local` na raiz (se não existir) e adicione:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=cole_aqui_a_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=cole_aqui_a_chave_anon
   ```

## 4. Reiniciar o Servidor
1. Feche o terminal onde o `npm run dev` está rodando.
2. Execute `npm run dev` novamente.

O RADAR detectará automaticamente as chaves e começará a se preparar para a sincronização global! 🌐🛰️🚀

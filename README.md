# 🚀 Skiller

**Projeto para a Batalha de Inovação V360 2025**

> O campo de treino para o seu principal diferencial no mercado pós-IA.

---

## 1. O Problema

O mundo do trabalho está mudando. A Inteligência Artificial está automatizando *hard skills* (tarefas técnicas) em velocidade recorde, tornando as *soft skills* (comunicação, persuasão, inteligência emocional) o principal diferencial competitivo para um jovem profissional.

O paradoxo é que o próprio ambiente de trabalho pós-IA (remoto, assíncrono) eliminou os "campos de treino" naturais para essas habilidades. O jovem precisa provar que tem uma habilidade que o ambiente de trabalho parou de ensinar.

## 2. A Solução: Skiller

O Skiller é um **"simulador de voo" para habilidades comportamentais**.

Em vez de workshops teóricos, o Skiller usa IA Generativa (Google GenAI) para criar simulações de entrevistas e conversas difíceis em tempo real. Nossa plataforma permite que o usuário pratique sua comunicação por voz, receba feedback instantâneo de uma IA (configurada com personas realistas, como a do CTO "Ricardo Vasconcelos") e acompanhe seu progresso através de scores e medalhas (gamificação).

## 3. Funcionalidades do MVP (O que está pronto)

* **Carregamento Dinâmico de Cenário:** O prompt do entrevistador (a persona "Ricardo Vasconcelos") é carregado dinamicamente do Supabase.
* **Simulação em Tempo Real:** Conversa fluida com áudio (entrada e saída) via `live.connect`.
* **Persistência Completa:** A sessão, cada mensagem (usuário e IA) e o feedback final são salvos no Supabase.
* **Feedback e Gamificação:** Ao final da entrevista, o front-end faz o parse das notas, salva o feedback e concede a medalha (Badge) ao usuário.

## 4. Configuração do Ambiente

### Pré-requisitos
* Node.js (v18+)
* Um projeto Supabase (com o schema do banco de dados aplicado)
* Uma Chave de API do Google GenAI

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes chaves:

#### Chaves do Supabase (Project Settings > API)
VITE_SUPABASE_URL=httpsYOUR_PROJECT_URL.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLIC

#### Chave do Google AI (Vertex AI ou AI Studio)
VITE_API_KEY=SUA_CHAVE_DE_API_DO_GOOGLE
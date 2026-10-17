# Inimigo das Provas — PRD

## Original problem statement
"A ideia é transformar isso em uma platafroma de estudantes, o melhor web app ja feito, mas falta muita coisa tambem" (base: arquivo enviado "Inimigo das Provas (3).html", protótipo React de arquivo único com Treino, Simulado, Professor, Ferramentas e Progresso).

User choices: login skipped → default e-mail/senha (JWT); IA answered "Lovable" (not an LLM) → default Claude (claude-sonnet-5-5) via Emergent Universal Key; priorities: Professor IA real + ferramentas IA, gerar questões com IA por assunto/série, plano de estudos até a prova; visual: manter escuro + verde-limão, mais premium; público: todas as idades e anos escolares.

## Architecture
- Backend FastAPI: server.py (rotas /api), core.py (Mongo, modelos BaseDocument, auth JWT/bcrypt), ai.py (Claude streaming SSE + parser de questões JSON), plan.py (gerador de cronograma), seed_questions.json (49 questões originais).
- Frontend React (CRA/craco): lib/api.js (axios Bearer + streamPost SSE), AuthContext, Layout (sidebar desktop + bottom nav mobile), páginas Dashboard, Treino, Simulado, Professor, Ferramentas (7), Plano, Progresso.
- Mongo collections: users, questions, attempts, simulados, chat_sessions, chat_messages, study_plans, login_attempts.

## User personas
Estudantes do 1º ano do fundamental até ENEM/vestibular/concurso/faculdade.

## Core requirements
Contas por aluno (dados isolados por usuário); treino adaptativo com tipos de erro (interpretação, distração, conceito, cálculo); simulados cronometrados com revisão; Professor IA com histórico; ferramentas IA; geração de questões IA; plano de estudos; progresso.

## Implemented (2026-10-17)
- Auth e-mail/senha (registro, login, perfil, bloqueio após 5 tentativas), admin semeado.
- Treino adaptativo (filtros série/Revanche/matéria, dica = 5 XP, gerar 5 questões IA quando o filtro está vazio).
- Simulado (matéria/série/qtd, timer, navegação, revisão, histórico).
- Professor IA com conversas salvas e streaming.
- Ferramentas: Aprender (IA), Gerar questões (IA), Upload de material .txt/.md → resumo/flashcards/mapa/desafio (IA), Fabricante de Provas (banco ou IA), Raio-X, Caça à Pegadinha, Criar questão.
- Plano de estudos (prova, data, matérias, minutos/dia, dias da semana → estudo, treino, revisão espaçada, simulado semanal; checklist, atrasadas).
- Progresso: XP, precisão, sequência, nível, gráfico 14 dias, erros por tipo, matérias, conteúdos, simulados, apagar progresso.
- Verified manually: API register/train/chat stream/plan via curl; login, dashboard and treino (mobile) screenshots. Testing agent NOT yet run.

## Backlog
- P0: Full end-to-end run by the testing agent.
- P1: Upload de PDF/imagem (hoje só .txt/.md), recuperação de senha por e-mail.
- P2: Ranking, conquistas, painel admin para revisar questões.

## Next tasks
Run testing agent; PDF upload.

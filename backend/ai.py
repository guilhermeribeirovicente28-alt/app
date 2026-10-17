import json
import os
import re
import uuid

from fastapi.responses import StreamingResponse
from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage, TextDelta, StreamDone

PROVIDER, MODEL = "anthropic", "claude-sonnet-5-5"

TUTOR_SYSTEM = (
    "Você é o Professor do app 'Inimigo das Provas', um tutor brasileiro paciente e didático para estudantes "
    "de todas as idades (do ensino fundamental ao ENEM, vestibulares, concursos e faculdade). "
    "Responda sempre em português do Brasil. Explique passo a passo, com linguagem adequada ao nível do aluno, "
    "use exemplos curtos e, quando fizer sentido, termine com uma pergunta rápida para checar o entendimento. "
    "Use Markdown (títulos curtos, listas, **negrito**). Se não tiver certeza de algo, diga claramente. "
    "Nunca entregue só a resposta de um exercício: mostre o raciocínio."
)


def _chat(system: str, history: list | None = None) -> LlmChat:
    initial = [{"role": "system", "content": system}] + (history or [])
    return LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=str(uuid.uuid4()),
        system_message=system,
        initial_messages=initial,
    ).with_model(PROVIDER, MODEL)


async def stream_text(system: str, prompt: str, history: list | None = None, images: list[str] | None = None):
    chat = _chat(system, history)
    msg = UserMessage(text=prompt, file_contents=[ImageContent(b) for b in images or []])
    async for ev in chat.stream_message(msg):
        if isinstance(ev, TextDelta):
            yield ev.content
        elif isinstance(ev, StreamDone):
            break


async def complete(system: str, prompt: str, images: list[str] | None = None) -> str:
    return "".join([c async for c in stream_text(system, prompt, images=images)])


OCR_PROMPT = (
    "Transcreva fielmente todo o texto desta foto de material de estudo (apostila, caderno, livro), em português, "
    "mantendo títulos, listas e fórmulas. Se houver diagramas, descreva-os em uma linha entre colchetes. "
    "Responda só com a transcrição. Se não houver texto legível, responda exatamente: SEM_TEXTO"
)


def sse_response(gen):
    async def events():
        try:
            async for chunk in gen:
                yield f"data: {json.dumps({'t': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:  # surface LLM errors to the client
            yield f"data: {json.dumps({'error': 'A IA não respondeu agora. Tente de novo em instantes.', 'detail': str(e)[:200]})}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


QUESTION_SYSTEM = (
    "Você cria questões de múltipla escolha inéditas para estudantes brasileiros. Responda APENAS com JSON válido, "
    "sem texto antes ou depois, sem blocos de código."
)


def question_prompt(subj: str, topic: str, grade: str, level: int, n: int) -> str:
    return (
        f"Crie {n} questões de múltipla escolha de {subj}, assunto '{topic or 'variado dentro da matéria'}', "
        f"para o nível escolar '{grade}', dificuldade {level} (1 fácil, 2 média, 3 difícil). "
        "Cada questão tem exatamente 4 alternativas e uma correta. As alternativas erradas devem ser plausíveis e "
        "representar erros típicos de estudantes. Classifique cada alternativa errada pelo tipo de erro que ela provoca: "
        "'interp' (interpretação do enunciado), 'distr' (distração/pressa), 'conc' (conceito errado) ou 'calc' (erro de cálculo). "
        "Formato: um array JSON de objetos com as chaves: "
        '"topic" (string curta), "prompt" (enunciado), "opts" (array de 4 strings, sem letras A/B/C/D), '
        '"ans" (índice 0-3 da correta), "err" (array de 4 itens: null na correta e o tipo de erro nas demais), '
        '"hint" (dica curta sem entregar a resposta), "why" (explicação de 1 a 3 frases, citando o erro mais comum).'
    )


ERR_TYPES = {"interp", "distr", "conc", "calc"}


def parse_questions(text: str) -> list[dict]:
    match = re.search(r"\[.*\]", text, re.S)
    if not match:
        return []
    try:
        raw = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []
    out = []
    for q in raw if isinstance(raw, list) else []:
        try:
            opts = [str(o).strip() for o in q["opts"]]
            ans = int(q["ans"])
            if len(opts) != 4 or not 0 <= ans <= 3 or not str(q["prompt"]).strip():
                continue
            err = list(q.get("err") or [None] * 4)[:4] + [None] * max(0, 4 - len(q.get("err") or []))
            err = [None if i == ans else (e if e in ERR_TYPES else "conc") for i, e in enumerate(err)]
            out.append({"topic": str(q.get("topic") or "").strip(), "prompt": str(q["prompt"]).strip(), "opts": opts,
                        "ans": ans, "err": err, "hint": str(q.get("hint") or "").strip(),
                        "why": str(q.get("why") or "").strip()})
        except (KeyError, TypeError, ValueError):
            continue
    return out

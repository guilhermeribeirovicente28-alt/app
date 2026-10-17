import uuid
from datetime import date, timedelta

DEFAULT_TOPICS = {
    "Matemática": ["Frações", "Porcentagem", "Equações", "Funções", "Geometria", "Probabilidade", "Estatística"],
    "Português": ["Interpretação de texto", "Classes de palavras", "Concordância", "Crase", "Orações", "Figuras de linguagem"],
    "Linguagens": ["Interpretação de texto", "Funções da linguagem", "Gêneros textuais", "Figuras de linguagem"],
    "Redação": ["Estrutura dissertativa", "Repertório", "Proposta de intervenção", "Coesão e coerência"],
    "Física": ["Cinemática", "Dinâmica", "Energia", "Eletricidade", "Ondas", "Termologia"],
    "Química": ["Atomística", "Tabela periódica", "Ligações químicas", "Soluções", "Estequiometria", "Orgânica"],
    "Biologia": ["Citologia", "Genética", "Ecologia", "Fisiologia humana", "Evolução", "Botânica"],
    "História": ["Brasil Colônia", "Brasil Império", "Era Vargas", "Revoluções", "Guerras Mundiais", "Ditadura militar"],
    "Geografia": ["Cartografia", "Clima", "Urbanização", "Biomas brasileiros", "Geopolítica", "Meio ambiente"],
    "Inglês": ["Leitura de textos", "Vocabulário", "Tempos verbais", "False friends"],
    "Ciências": ["Corpo humano", "Seres vivos", "Matéria e energia", "Terra e Universo"],
    "Filosofia": ["Filosofia antiga", "Ética", "Filosofia moderna", "Política"],
    "Sociologia": ["Clássicos da sociologia", "Trabalho", "Cultura", "Movimentos sociais"],
}


def _task(kind: str, subj: str, topic: str, minutes: int) -> dict:
    titles = {"estudo": f"Estudar {topic}", "treino": f"Treinar questões de {topic}",
              "revisao": f"Revisar {topic}", "simulado": "Simulado geral"}
    return {"id": uuid.uuid4().hex[:12], "kind": kind, "subj": subj, "topic": topic,
            "minutes": max(10, minutes), "title": titles[kind], "done": False}


def build_days(subjects: list[str], topics: dict[str, list[str]], start: date, exam: date,
               minutes: int, weekdays: list[int]) -> list[dict]:
    queues = {s: list(topics.get(s) or DEFAULT_TOPICS.get(s) or ["Revisão geral"]) for s in subjects}
    cursor = {s: 0 for s in subjects}
    studied: list[tuple[str, str]] = []
    days, d, si, n = [], start, 0, 0
    while d <= exam and len(days) < 200:
        if d.weekday() in weekdays:
            n += 1
            remaining = (exam - d).days
            tasks = []
            if remaining <= 2:
                tasks.append(_task("revisao", "Geral", "pontos fracos e fórmulas", minutes // 2))
                if remaining == 0:
                    tasks = [_task("revisao", "Geral", "resumos (leve) e descanso", 30)]
            elif n % 7 == 0:
                tasks.append(_task("simulado", "Geral", "Todas as matérias", minutes))
            else:
                subj = subjects[si % len(subjects)]
                si += 1
                topic = queues[subj][cursor[subj] % len(queues[subj])]
                cursor[subj] += 1
                main = int(minutes * 0.5) if minutes > 45 else int(minutes * 0.6)
                tasks.append(_task("estudo", subj, topic, main))
                tasks.append(_task("treino", subj, topic, int(minutes * 0.3) if minutes > 45 else minutes - main))
                if minutes > 45 and len(studied) >= 3:
                    rs, rt = studied[-3]
                    tasks.append(_task("revisao", rs, rt, minutes - main - int(minutes * 0.3)))
                studied.append((subj, topic))
            days.append({"date": d.isoformat(), "tasks": tasks})
        d += timedelta(days=1)
    return days

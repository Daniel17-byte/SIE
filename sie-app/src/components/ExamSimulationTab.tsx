import { useCallback, useEffect, useMemo, useState } from "react";
import GrileCard from "./GrileCard";
import type { QuizSourceConfig, SimulationSummary } from "./GrileCard";
import type { Question } from "../data/questions";
import "./ExamSimulationTab.css";

type ExamPart = "partial" | "examen";

interface ExamPartConfig {
  label: string;
  grileCount: number;
  openCount: number;
  minPoints: number;
}

interface Props {
  partialOpenQuestions: Question[];
  examenOpenQuestions: Question[];
  grileSources: Record<ExamPart, readonly QuizSourceConfig[]>;
  onSimulationComplete?: (summary: SimulationSummary) => void;
  onSaveExamStats?: (entry: string) => Promise<void> | void;
  isLoadingOpenQuestions: boolean;
  openQuestionError: string | null;
}

const PART_CONFIG: Record<ExamPart, ExamPartConfig> = {
  partial: {
    label: "Partial",
    grileCount: 9,
    openCount: 8,
    minPoints: 15,
  },
  examen: {
    label: "Examen",
    grileCount: 9,
    openCount: 11,
    minPoints: 20,
  },
};

const GRILA_POINTS = 2;
const OPEN_QUESTION_POINTS = 3;

function getRandomIndex(maxExclusive: number) {
  if (maxExclusive <= 0) {
    return 0;
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const randomValues = new Uint32Array(1);
    const upperBound = 0x1_0000_0000;
    const threshold = upperBound - (upperBound % maxExclusive);

    let randomValue = 0;
    do {
      crypto.getRandomValues(randomValues);
      randomValue = randomValues[0];
    } while (randomValue >= threshold);

    return randomValue % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

function shuffleItems<T>(items: readonly T[]) {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = getRandomIndex(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function pickRandomItems<T>(items: readonly T[], count: number) {
  if (count <= 0 || items.length === 0) {
    return [] as T[];
  }

  return shuffleItems(items).slice(0, Math.min(items.length, count));
}

function getOpenQuestionKey(question: Question) {
  return `${question.id}::${question.title}`;
}

export default function ExamSimulationTab({
  partialOpenQuestions,
  examenOpenQuestions,
  grileSources,
  onSimulationComplete,
  onSaveExamStats,
  isLoadingOpenQuestions,
  openQuestionError,
}: Props) {
  const [part, setPart] = useState<ExamPart>("partial");
  const [openSessionQuestions, setOpenSessionQuestions] = useState<Question[]>([]);
  const [openIndex, setOpenIndex] = useState(0);
  const [isOpenSessionFinished, setIsOpenSessionFinished] = useState(false);
  const [openPointsByPart, setOpenPointsByPart] = useState<Record<ExamPart, number | null>>({
    partial: null,
    examen: null,
  });
  const [openQuestionScoresByPart, setOpenQuestionScoresByPart] = useState<
    Record<ExamPart, Record<string, number>>
  >({
    partial: {},
    examen: {},
  });
  const [grileSummaryByPart, setGrileSummaryByPart] = useState<Record<ExamPart, SimulationSummary | null>>({
    partial: null,
    examen: null,
  });
  const [examStatsStatus, setExamStatsStatus] = useState("");

  const currentPartConfig = PART_CONFIG[part];

  const openQuestionPool = useMemo(
    () => (part === "partial" ? partialOpenQuestions : examenOpenQuestions),
    [examenOpenQuestions, part, partialOpenQuestions]
  );

  const startOpenSession = useCallback(() => {
    const nextQuestions = pickRandomItems(openQuestionPool, currentPartConfig.openCount);
    setOpenSessionQuestions(nextQuestions);
    setOpenIndex(0);
    setIsOpenSessionFinished(false);
    setOpenQuestionScoresByPart((prev) => ({
      ...prev,
      [part]: {},
    }));
    setOpenPointsByPart((prev) => ({
      ...prev,
      [part]: null,
    }));
  }, [currentPartConfig.openCount, openQuestionPool, part]);

  useEffect(() => {
    if (isLoadingOpenQuestions || openQuestionError) {
      setOpenSessionQuestions([]);
      setOpenIndex(0);
      setIsOpenSessionFinished(false);
      return;
    }

    startOpenSession();
  }, [isLoadingOpenQuestions, openQuestionError, part, startOpenSession]);

  const currentOpenQuestion = openSessionQuestions[openIndex] ?? null;
  const currentOpenQuestionScores = openQuestionScoresByPart[part] ?? {};
  const currentOpenPoints = openPointsByPart[part];
  const currentMaxOpenPoints = currentPartConfig.openCount * OPEN_QUESTION_POINTS;
  const hasValidOpenPoints = currentOpenPoints !== null;
  const currentGrileSummary = grileSummaryByPart[part];
  const currentGrilePoints = currentGrileSummary ? currentGrileSummary.score * GRILA_POINTS : null;
  const currentTotalPoints =
    currentGrilePoints !== null && hasValidOpenPoints
      ? currentGrilePoints + (currentOpenPoints ?? 0)
      : null;
  const currentPartPassed =
    currentTotalPoints !== null && currentTotalPoints >= currentPartConfig.minPoints;
  const hasAllOpenQuestionScores =
    openSessionQuestions.length > 0 &&
    openSessionQuestions.every((question) => typeof currentOpenQuestionScores[getOpenQuestionKey(question)] === "number");

  const currentOpenQuestionKey = currentOpenQuestion ? getOpenQuestionKey(currentOpenQuestion) : null;
  const currentOpenQuestionScore =
    currentOpenQuestionKey !== null ? currentOpenQuestionScores[currentOpenQuestionKey] : undefined;

  const partStatus = useMemo(
    () =>
      (Object.keys(PART_CONFIG) as ExamPart[]).map((partKey) => {
        const partConfig = PART_CONFIG[partKey];
        const summary = grileSummaryByPart[partKey];
        const grilePoints = summary ? summary.score * GRILA_POINTS : null;
        const maxOpenPoints = partConfig.openCount * OPEN_QUESTION_POINTS;
        const openPoints = openPointsByPart[partKey];
        const hasOpenPoints = openPoints !== null;
        const totalPoints =
          grilePoints !== null && hasOpenPoints ? grilePoints + (openPoints ?? 0) : null;
        const passed = totalPoints !== null && totalPoints >= partConfig.minPoints;

        return {
          partKey,
          label: partConfig.label,
          minPoints: partConfig.minPoints,
          grilePoints,
          maxGrilePoints: partConfig.grileCount * GRILA_POINTS,
          openPoints,
          maxOpenPoints,
          totalPoints,
          passed,
        };
      }),
    [grileSummaryByPart, openPointsByPart]
  );

  const isOverallPassed = partStatus.every((entry) => entry.passed);
  const canSaveExamStats = partStatus.every((entry) => entry.totalPoints !== null);

  const buildExamStatsEntry = useCallback(() => {
    const completedDate = new Date().toLocaleString("ro-RO");
    const lines = partStatus
      .map((entry) => {
        const grileText = `${entry.grilePoints ?? "-"}/${entry.maxGrilePoints}p`;
        const openText = `${entry.openPoints ?? "-"}/${entry.maxOpenPoints}p`;
        const totalText = `${entry.totalPoints ?? "-"}p (minim ${entry.minPoints}p)`;
        const statusText = entry.passed ? "PROMOVAT" : "NEPROMOVAT";
        return `- ${entry.label}: grile ${grileText}, deschise ${openText}, total ${totalText} -> ${statusText}`;
      })
      .join("\n");

    return [
      "------------------------------------------------------------",
      `Data: ${completedDate}`,
      "Mod: simulare examen (2 parti)",
      `Reguli punctaj: grila=${GRILA_POINTS}p, deschisa=${OPEN_QUESTION_POINTS}p`,
      `Status final: ${isOverallPassed ? "PROMOVAT" : "NEPROMOVAT"} (obligatoriu ambele parti)`,
      "Detalii parti:",
      lines,
    ].join("\n");
  }, [isOverallPassed, partStatus]);

  const handlePartGrileComplete = useCallback(
    (summary: SimulationSummary) => {
      setGrileSummaryByPart((prev) => ({
        ...prev,
        [part]: summary,
      }));
      onSimulationComplete?.(summary);
    },
    [onSimulationComplete, part]
  );

  const handleSaveExamStats = useCallback(async () => {
    if (!onSaveExamStats) {
      setExamStatsStatus("Conecteaza mai intai fisierul de statistici din bara de sus.");
      return;
    }

    if (!canSaveExamStats) {
      setExamStatsStatus("Finalizeaza ambele parti si introdu punctajele la deschise inainte de salvare.");
      return;
    }

    try {
      await onSaveExamStats(buildExamStatsEntry());
      setExamStatsStatus(`Statistica simulare examen salvata (${new Date().toLocaleTimeString("ro-RO")}).`);
    } catch {
      setExamStatsStatus("Nu am putut salva statistica simulare examen.");
    }
  }, [buildExamStatsEntry, canSaveExamStats, onSaveExamStats]);

  const handleSetCurrentOpenScore = useCallback(
    (score: number) => {
      if (!currentOpenQuestion) {
        return;
      }

      const clampedScore = Math.max(0, Math.min(OPEN_QUESTION_POINTS, score));
      const key = getOpenQuestionKey(currentOpenQuestion);
      setOpenQuestionScoresByPart((prev) => ({
        ...prev,
        [part]: {
          ...prev[part],
          [key]: clampedScore,
        },
      }));
    },
    [currentOpenQuestion, part]
  );

  const handleFinishOpenSession = useCallback(() => {
    if (!hasAllOpenQuestionScores) {
      return;
    }

    const totalPoints = openSessionQuestions.reduce((sum, question) => {
      const key = getOpenQuestionKey(question);
      return sum + (currentOpenQuestionScores[key] ?? 0);
    }, 0);

    setOpenPointsByPart((prev) => ({
      ...prev,
      [part]: totalPoints,
    }));
    setIsOpenSessionFinished(true);
  }, [currentOpenQuestionScores, hasAllOpenQuestionScores, openSessionQuestions, part]);

  return (
    <div className="exam-sim-wrapper">
      <section className="exam-sim-intro-card">
        <div>
          <span className="exam-sim-badge">Simulare examen</span>
          <h2>2 părți separate: Partial / Examen</h2>
          <p>
            Fiecare parte are grile random și întrebări deschise random. Pentru întrebările deschise
            îți treci singur nota.
          </p>
        </div>

        <div className="exam-part-switch" role="tablist" aria-label="Alege partea de simulare">
          {(Object.keys(PART_CONFIG) as ExamPart[]).map((partKey) => (
            <button
              key={partKey}
              type="button"
              className={`exam-part-btn ${part === partKey ? "exam-part-btn-active" : ""}`}
              onClick={() => setPart(partKey)}
            >
              {PART_CONFIG[partKey].label}
            </button>
          ))}
        </div>

        <p className="exam-sim-intro-meta">
          {currentPartConfig.label}: {currentPartConfig.grileCount} grile random + {currentPartConfig.openCount} întrebări deschise random.
        </p>

        <div className="exam-score-rules">
          <p>
            Punctaj: 1 grilă = {GRILA_POINTS}p, 1 întrebare deschisă = {OPEN_QUESTION_POINTS}p.
          </p>
          <p>
            Prag minim: Partial {PART_CONFIG.partial.minPoints}p, Examen {PART_CONFIG.examen.minPoints}p.
            Trebuie luate ambele părți.
          </p>
        </div>

        <div className="exam-part-status-grid">
          {partStatus.map((entry) => (
            <div
              key={entry.partKey}
              className={`exam-part-status-card ${entry.passed ? "exam-part-status-pass" : "exam-part-status-pending"}`}
            >
              <h4>{entry.label}</h4>
              <p>
                Grile: {entry.grilePoints ?? "-"} / {entry.maxGrilePoints}p
              </p>
              <p>
                Deschise: {entry.openPoints ?? "-"} / {entry.maxOpenPoints}p
              </p>
              <p>
                Total: {entry.totalPoints ?? "-"}p (minim {entry.minPoints}p)
              </p>
            </div>
          ))}
        </div>

        <p className={`exam-overall-status ${isOverallPassed ? "exam-overall-status-pass" : ""}`}>
          Status final: {isOverallPassed ? "Promovat (ambele părți luate)" : "Neeligibil încă - trebuie luate ambele părți"}
        </p>

        <div className="exam-save-row">
          <button
            type="button"
            className="tab-btn"
            onClick={() => {
              void handleSaveExamStats();
            }}
            disabled={!canSaveExamStats}
          >
            Salveaza statistica examen
          </button>
          {examStatsStatus ? <span className="exam-save-status">{examStatsStatus}</span> : null}
        </div>
      </section>

      <GrileCard
        modeLabel={`Simulare ${currentPartConfig.label}`}
        sources={grileSources[part]}
        quizSize={currentPartConfig.grileCount}
        onSimulationComplete={handlePartGrileComplete}
      />

      <section className="exam-open-card">
        <div className="exam-open-header">
          <div>
            <span className="exam-sim-badge exam-sim-badge-secondary">Întrebări deschise</span>
            <h3>Evaluare proprie ({currentPartConfig.label})</h3>
            <p>
              Pentru fiecare întrebare deschisă îți dai punctaj între 0 și 3, apoi treci la următoarea.
            </p>
          </div>
          <button type="button" className="nav-btn" onClick={startOpenSession}>
            🔄 Întrebări deschise noi
          </button>
        </div>

        {isLoadingOpenQuestions ? (
          <p className="exam-open-status">Se încarcă întrebările deschise…</p>
        ) : openQuestionError ? (
          <p className="exam-open-status exam-open-status-error">{openQuestionError}</p>
        ) : openSessionQuestions.length === 0 ? (
          <p className="exam-open-status">Nu există suficiente întrebări în acest set.</p>
        ) : isOpenSessionFinished ? (
          <div className="exam-open-finish">
            <p>
              Ai parcurs <strong>{openSessionQuestions.length}</strong> întrebări deschise din setul {currentPartConfig.label.toLowerCase()}.
            </p>
            {hasValidOpenPoints ? (
              <p className="exam-open-grade-preview">
                Punctaj curent: grile {currentGrilePoints ?? "-"}p + deschise {currentOpenPoints}p ={" "}
                <strong>{currentTotalPoints ?? "-"}p</strong>.
                {currentPartPassed
                  ? ` Pragul minim (${currentPartConfig.minPoints}p) este atins.`
                  : ` Mai ai nevoie de ${Math.max(currentPartConfig.minPoints - (currentTotalPoints ?? 0), 0)}p.`}
              </p>
            ) : (
              <p className="exam-open-grade-preview">
                Introdu un punctaj valid între 0 și {currentMaxOpenPoints}.
              </p>
            )}
          </div>
        ) : currentOpenQuestion ? (
          <div className="exam-open-question">
            <div className="exam-open-meta">
              Întrebarea {openIndex + 1} din {openSessionQuestions.length}
            </div>
            <h4>{currentOpenQuestion.title}</h4>
            <p className="exam-open-source">Sursă: {currentOpenQuestion.source}</p>
            <p className="exam-open-content exam-open-content-hidden">
              Răspunsul nu este afișat în simularea de examen.
            </p>

            <div className="exam-open-score-row">
              <span className="exam-open-score-label">Punctaj întrebare:</span>
              <div className="exam-open-score-buttons">
                {[0, 1, 2, 3].map((score) => (
                  <button
                    key={score}
                    type="button"
                    className={`exam-score-btn ${currentOpenQuestionScore === score ? "exam-score-btn-active" : ""}`}
                    onClick={() => handleSetCurrentOpenScore(score)}
                  >
                    {score}p
                  </button>
                ))}
              </div>
            </div>

            <div className="exam-open-nav">
              <button
                type="button"
                className="nav-btn"
                onClick={() => setOpenIndex((index) => Math.max(index - 1, 0))}
                disabled={openIndex === 0}
              >
                ← Anterior
              </button>

              {openIndex === openSessionQuestions.length - 1 ? (
                <button
                  type="button"
                  className="nav-btn"
                  onClick={handleFinishOpenSession}
                  disabled={!hasAllOpenQuestionScores}
                >
                  ✅ Finalizează deschisele
                </button>
              ) : (
                <button
                  type="button"
                  className="nav-btn"
                  onClick={() =>
                    setOpenIndex((index) => Math.min(index + 1, openSessionQuestions.length - 1))
                  }
                  disabled={typeof currentOpenQuestionScore !== "number"}
                >
                  Continuă →
                </button>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}


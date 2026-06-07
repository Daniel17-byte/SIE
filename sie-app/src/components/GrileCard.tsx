import { useCallback, useEffect, useMemo, useState } from "react";
import type { FC } from "react";
import "./GrileCard.css";

interface GrilaQuestion {
  id: number;
  question: string;
  answers: string[];
  correctAnswers?: string[];
  chapter?: string;
}

interface QuizSourceConfig {
  id: string;
  path: string;
  label: string;
  hasAnswerKey: boolean;
}

interface QuizQuestion extends GrilaQuestion {
  uid: string;
  sourceId: string;
  sourceLabel: string;
  hasAnswerKey: boolean;
  chapter: string;
}

interface QuizResult {
  question: QuizQuestion;
  selectedAnswers: string[];
  isCorrect: boolean | null;
}

export interface ChapterScoreSummary {
  chapter: string;
  totalQuestions: number;
  evaluatedQuestions: number;
  correctAnswers: number;
  percentage: number | null;
}

export interface SimulationSummary {
  completedAt: string;
  modeLabel: string;
  sourceLabels: string;
  selectedChapterLabel: string;
  questionCount: number;
  evaluatedCount: number;
  score: number;
  percentage: number | null;
  chapterScores: ChapterScoreSummary[];
}

interface Props {
  modeLabel: string;
  sources: readonly QuizSourceConfig[];
  onSimulationComplete?: (summary: SimulationSummary) => void;
}

const QUIZ_SIZE = 10;
const QUIZ_HISTORY_LIMIT = QUIZ_SIZE * 3;
const ALL_CHAPTERS_VALUE = "__all__";
const DEFAULT_CHAPTER_LABEL = "Diverse";

function getChapterLabel(chapter: string | undefined) {
  if (typeof chapter !== "string") {
    return DEFAULT_CHAPTER_LABEL;
  }

  const trimmedChapter = chapter.trim();
  return trimmedChapter.length > 0 ? trimmedChapter : DEFAULT_CHAPTER_LABEL;
}

function getRandomIndex(maxExclusive: number) {
  if (maxExclusive <= 0) {
    return 0;
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const randomValues = new Uint32Array(1);
    crypto.getRandomValues(randomValues);
    return randomValues[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

function shuffleQuestions<T>(items: T[]) {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = getRandomIndex(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function getQuizHistoryKey(sources: readonly QuizSourceConfig[]) {
  const sourceIds = sources.map((source) => source.id).sort().join("+");
  return `sie-app:quiz-history:${sourceIds}`;
}

function getBlockedQuestionsKey(sources: readonly QuizSourceConfig[]) {
  const sourceIds = sources.map((source) => source.id).sort().join("+");
  return `sie-app:quiz-blocked:${sourceIds}`;
}

function readRecentQuestionHistory(historyKey: string) {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const rawHistory = window.localStorage.getItem(historyKey);
    if (!rawHistory) {
      return [] as string[];
    }

    const parsedHistory = JSON.parse(rawHistory);
    return Array.isArray(parsedHistory)
      ? parsedHistory.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [] as string[];
  }
}

function writeRecentQuestionHistory(historyKey: string, questionIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const nextHistory = [...new Set(questionIds)].slice(0, QUIZ_HISTORY_LIMIT);

  try {
    window.localStorage.setItem(historyKey, JSON.stringify(nextHistory));
  } catch {
    // Ignore storage write failures and continue with in-memory quiz generation.
  }
}

function readBlockedQuestionIds(blockedKey: string) {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const rawBlockedIds = window.sessionStorage.getItem(blockedKey);
    if (!rawBlockedIds) {
      return [] as string[];
    }

    const parsedBlockedIds = JSON.parse(rawBlockedIds);
    return Array.isArray(parsedBlockedIds)
      ? parsedBlockedIds.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [] as string[];
  }
}

function writeBlockedQuestionIds(blockedKey: string, questionIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(blockedKey, JSON.stringify([...new Set(questionIds)]));
  } catch {
    // Ignore storage write failures and continue with in-memory filtering.
  }
}

function isExactMatch(selectedAnswers: string[], correctAnswers: string[]) {
  if (selectedAnswers.length !== correctAnswers.length) {
    return false;
  }

  const selectedSet = new Set(selectedAnswers);
  return correctAnswers.every((answer) => selectedSet.has(answer));
}

function formatAnswerWithLabel(question: QuizQuestion, answer: string) {
  const index = question.answers.indexOf(answer);

  if (index === -1) {
    return answer;
  }

  return `${String.fromCharCode(65 + index)}. ${answer}`;
}

const GrileCard: FC<Props> = ({ modeLabel, sources, onSimulationComplete }) => {
  const [questionPool, setQuestionPool] = useState<QuizQuestion[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [reviewedAnswers, setReviewedAnswers] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(ALL_CHAPTERS_VALUE);
  const [blockedQuestionIds, setBlockedQuestionIds] = useState<string[]>([]);

  const sourceLabels = useMemo(
    () => sources.map((source) => source.label).join(" + "),
    [sources]
  );

  const activeQuizHistoryKey = useMemo(
    () => `${getQuizHistoryKey(sources)}:${selectedChapter}`,
    [selectedChapter, sources]
  );

  const blockedQuestionsKey = useMemo(
    () => getBlockedQuestionsKey(sources),
    [sources]
  );

  const blockedQuestionSet = useMemo(
    () => new Set(blockedQuestionIds),
    [blockedQuestionIds]
  );

  useEffect(() => {
    setBlockedQuestionIds(readBlockedQuestionIds(blockedQuestionsKey));
  }, [blockedQuestionsKey]);

  useEffect(() => {
    writeBlockedQuestionIds(blockedQuestionsKey, blockedQuestionIds);
  }, [blockedQuestionIds, blockedQuestionsKey]);

  const startQuiz = useCallback((questions: QuizQuestion[]) => {
    const quizSize = Math.min(QUIZ_SIZE, questions.length);
    const recentQuestionHistory = readRecentQuestionHistory(activeQuizHistoryKey);
    const recentQuestionSet = new Set(recentQuestionHistory);

    const freshQuestions = shuffleQuestions(
      questions.filter((question) => !recentQuestionSet.has(question.uid))
    );
    const repeatedQuestions = shuffleQuestions(
      questions.filter((question) => recentQuestionSet.has(question.uid))
    );

    const pickedQuestions = [...freshQuestions, ...repeatedQuestions]
      .slice(0, quizSize)
      .map((question) => ({
        ...question,
        // Shuffle options per appearance to avoid learning answer positions.
        answers: shuffleQuestions(question.answers),
      }));

    writeRecentQuestionHistory(activeQuizHistoryKey, [
      ...pickedQuestions.map((question) => question.uid),
      ...recentQuestionHistory,
    ]);

    setQuizQuestions(pickedQuestions);
    setSelectedAnswers({});
    setReviewedAnswers({});
    setCurrentIndex(0);
    setIsSubmitted(false);
  }, [activeQuizHistoryKey]);

  useEffect(() => {
    let isMounted = true;

    async function loadQuestions() {
      try {
        setIsLoading(true);
        setError(null);

        const loadedSources = await Promise.all(
          sources.map(async (source) => {
            const response = await fetch(source.path);
            if (!response.ok) {
              throw new Error(`Nu am putut încărca întrebările din ${source.path}.`);
            }

            const data = (await response.json()) as GrilaQuestion[];
            if (!Array.isArray(data) || data.length === 0) {
              throw new Error(`Fișierul ${source.path} nu conține întrebări valide.`);
            }

            return data.map<QuizQuestion>((question) => ({
              ...question,
              uid: `${source.id}-${question.id}`,
              sourceId: source.id,
              sourceLabel: source.label,
              chapter: getChapterLabel(question.chapter),
              hasAnswerKey:
                source.hasAnswerKey &&
                Array.isArray(question.correctAnswers) &&
                question.correctAnswers.length > 0,
            }));
          })
        );

        if (!isMounted) {
          return;
        }

        const mergedQuestions = loadedSources.flat();
        setQuestionPool(mergedQuestions);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "A apărut o eroare la încărcarea grilelor."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [sources]);

  const chapterOptions = useMemo(() => {
    const chapters = Array.from(
      new Set(questionPool.map((question) => getChapterLabel(question.chapter)))
    );

    return chapters.sort((a, b) => a.localeCompare(b, "ro"));
  }, [questionPool]);

  useEffect(() => {
    if (
      selectedChapter !== ALL_CHAPTERS_VALUE &&
      !chapterOptions.includes(selectedChapter)
    ) {
      setSelectedChapter(ALL_CHAPTERS_VALUE);
    }
  }, [chapterOptions, selectedChapter]);

  const chapterQuestionPool = useMemo(() => {
    if (selectedChapter === ALL_CHAPTERS_VALUE) {
      return questionPool;
    }

    return questionPool.filter(
      (question) => getChapterLabel(question.chapter) === selectedChapter
    );
  }, [questionPool, selectedChapter]);

  const filteredQuestionPool = useMemo(
    () => chapterQuestionPool.filter((question) => !blockedQuestionSet.has(question.uid)),
    [blockedQuestionSet, chapterQuestionPool]
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (chapterQuestionPool.length === 0) {
      setQuizQuestions([]);
      setSelectedAnswers({});
      setReviewedAnswers({});
      setCurrentIndex(0);
      setIsSubmitted(false);
      return;
    }

    if (filteredQuestionPool.length === 0) {
      // If everything in the active chapter filter was blocked, reset for this session.
      setBlockedQuestionIds([]);
      return;
    }

    startQuiz(filteredQuestionPool);
  }, [chapterQuestionPool.length, filteredQuestionPool, isLoading, startQuiz]);

  const currentQuestion = quizQuestions[currentIndex];

  const results = useMemo<QuizResult[]>(
    () =>
      quizQuestions.map((question) => {
        const currentSelection = selectedAnswers[question.uid] ?? [];

        return {
          question,
          selectedAnswers: currentSelection,
          isCorrect: question.hasAnswerKey
            ? isExactMatch(currentSelection, question.correctAnswers ?? [])
            : null,
        };
      }),
    [quizQuestions, selectedAnswers]
  );

  const answeredCount = useMemo(
    () =>
      quizQuestions.filter(
        (question) => reviewedAnswers[question.uid]
      ).length,
    [quizQuestions, reviewedAnswers]
  );

  const evaluatedCount = useMemo(
    () => results.filter((result) => result.question.hasAnswerKey).length,
    [results]
  );

  const pendingCount = quizQuestions.length - evaluatedCount;

  const score = useMemo(
    () => results.filter((result) => result.isCorrect === true).length,
    [results]
  );

  const selectedChapterLabel =
    selectedChapter === ALL_CHAPTERS_VALUE ? "Toate capitolele" : selectedChapter;

  const simulationSummary = useMemo<SimulationSummary>(() => {
    const chapterMap = new Map<string, ChapterScoreSummary>();

    for (const result of results) {
      const chapter = result.question.chapter;
      const existing = chapterMap.get(chapter);

      if (existing) {
        existing.totalQuestions += 1;

        if (result.question.hasAnswerKey) {
          existing.evaluatedQuestions += 1;
          if (result.isCorrect === true) {
            existing.correctAnswers += 1;
          }
        }
        continue;
      }

      chapterMap.set(chapter, {
        chapter,
        totalQuestions: 1,
        evaluatedQuestions: result.question.hasAnswerKey ? 1 : 0,
        correctAnswers:
          result.question.hasAnswerKey && result.isCorrect === true ? 1 : 0,
        percentage: null,
      });
    }

    const chapterScores = Array.from(chapterMap.values())
      .map((entry) => ({
        ...entry,
        percentage:
          entry.evaluatedQuestions > 0
            ? Math.round((entry.correctAnswers / entry.evaluatedQuestions) * 100)
            : null,
      }))
      .sort((a, b) => a.chapter.localeCompare(b.chapter, "ro"));

    return {
      completedAt: new Date().toISOString(),
      modeLabel,
      sourceLabels,
      selectedChapterLabel,
      questionCount: quizQuestions.length,
      evaluatedCount,
      score,
      percentage: evaluatedCount > 0 ? Math.round((score / evaluatedCount) * 100) : null,
      chapterScores,
    };
  }, [evaluatedCount, modeLabel, quizQuestions.length, results, score, selectedChapterLabel, sourceLabels]);

  const handleSubmitQuiz = () => {
    onSimulationComplete?.(simulationSummary);
    setIsSubmitted(true);
  };

  const handleToggleAnswer = (answer: string) => {
    if (!currentQuestion || isSubmitted || reviewedAnswers[currentQuestion.uid]) {
      return;
    }

    setSelectedAnswers((prev) => {
      const currentSelection = prev[currentQuestion.uid] ?? [];
      const nextSelection = currentSelection.includes(answer)
        ? currentSelection.filter((item) => item !== answer)
        : [...currentSelection, answer];

      return {
        ...prev,
        [currentQuestion.uid]: currentQuestion.answers.filter((item) =>
          nextSelection.includes(item)
        ),
      };
    });
  };

  const handleRetake = () => {
    if (filteredQuestionPool.length > 0) {
      startQuiz(filteredQuestionPool);
    }
  };

  const handleBlockCurrentQuestion = () => {
    if (!currentQuestion) {
      return;
    }

    setBlockedQuestionIds((prev) => {
      if (prev.includes(currentQuestion.uid)) {
        return prev;
      }

      return [...prev, currentQuestion.uid];
    });
  };

  const handleCheckAnswer = () => {
    if (!currentQuestion) {
      return;
    }

    const currentSelection = selectedAnswers[currentQuestion.uid] ?? [];
    if (currentSelection.length === 0) {
      return;
    }

    setReviewedAnswers((prev) => ({
      ...prev,
      [currentQuestion.uid]: true,
    }));
  };

  const goToNextQuestion = () => {
    setCurrentIndex((index) => Math.min(index + 1, quizQuestions.length - 1));
  };

  if (isLoading) {
    return (
      <div className="grile-wrapper">
        <div className="grile-card grile-card-centered">
          <span className="grile-badge">Simulare grile</span>
          <h2 className="grile-title">Se încarcă întrebările…</h2>
          <p className="grile-subtitle">
            Pregătesc un set aleator de {QUIZ_SIZE} întrebări din {sourceLabels} pentru modul {modeLabel.toLowerCase()}.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grile-wrapper">
        <div className="grile-card grile-card-centered">
          <span className="grile-badge">Eroare</span>
          <h2 className="grile-title">Nu am putut porni simularea</h2>
          <p className="grile-subtitle">{error}</p>
          <button className="nav-btn" onClick={() => window.location.reload()}>
            Reîncarcă
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    const isChapterFilterActive = selectedChapter !== ALL_CHAPTERS_VALUE;

    return (
      <div className="grile-wrapper">
        <div className="grile-card grile-card-centered">
          <span className="grile-badge">Simulare grile</span>
          <h2 className="grile-title">Nu există întrebări disponibile</h2>
          <p className="grile-subtitle">
            {isChapterFilterActive
              ? `Nu există întrebări în capitolul "${selectedChapter}" pentru ${sourceLabels}.`
              : `Verifică fișierele pentru ${sourceLabels} și încearcă din nou.`}
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    const scorePercentage =
      evaluatedCount > 0
        ? `${Math.round((score / evaluatedCount) * 100)}%`
        : "—";

    return (
      <div className="grile-wrapper">
        <div className="grile-card">
          <div className="grile-header grile-header-stack">
            <div>
              <span className="grile-badge">Rezultat test</span>
              <h2 className="grile-title">Ai terminat simularea 🎉</h2>
              <p className="grile-subtitle">
                {evaluatedCount > 0 ? (
                  <>
                    Scor final: <strong>{score}</strong> / {evaluatedCount} întrebări evaluate.
                    {pendingCount > 0 ? ` ${pendingCount} întrebări sunt încă fără barem.` : ""}
                  </>
                ) : (
                  <>
                    Ai parcurs <strong>{quizQuestions.length}</strong> întrebări din {sourceLabels}. Răspunsurile corecte vor fi adăugate ulterior.
                  </>
                )}
              </p>
            </div>
            <div className="grile-score-box">
              <span className="grile-score-value">{scorePercentage}</span>
              <span className="grile-score-label">
                {evaluatedCount > 0 ? "precizie" : "fără scor"}
              </span>
            </div>
          </div>

          <div className="quiz-stats">
            <div className="quiz-stat">
              <span className="quiz-stat-value">{answeredCount}</span>
              <span className="quiz-stat-label">întrebări completate</span>
            </div>
            <div className="quiz-stat">
              <span className="quiz-stat-value">{evaluatedCount}</span>
              <span className="quiz-stat-label">întrebări evaluate</span>
            </div>
            <div className="quiz-stat">
              <span className="quiz-stat-value">{pendingCount}</span>
              <span className="quiz-stat-label">fără barem încă</span>
            </div>
          </div>

          <div className="quiz-actions">
            <button className="nav-btn" onClick={handleRetake}>
              🔄 Retake
            </button>
          </div>

          <div className="quiz-review-list">
            {results.map((result, index) => (
              <section
                key={result.question.uid}
                className={`quiz-review-card ${
                  result.isCorrect === true
                    ? "quiz-review-correct"
                    : result.isCorrect === false
                      ? "quiz-review-wrong"
                      : "quiz-review-pending"
                }`}
              >
                <div className="quiz-review-top">
                  <span className="quiz-review-index">#{index + 1}</span>
                  <span className="quiz-review-status">
                    {result.isCorrect === true
                      ? "Corect"
                      : result.isCorrect === false
                        ? "Greșit"
                        : "Neevaluat"}
                  </span>
                </div>
                <h3 className="quiz-review-question">{result.question.question}</h3>
                <p className="quiz-review-note">
                  Set: {result.question.sourceLabel} · Capitol: {result.question.chapter}
                </p>
                <div className="quiz-review-block">
                  <p>Răspunsul tău:</p>
                  {result.selectedAnswers.length > 0 ? (
                    <ul>
                      {result.selectedAnswers.map((answer) => (
                        <li key={answer}>
                          {formatAnswerWithLabel(result.question, answer)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="quiz-review-empty">Nu ai selectat niciun răspuns.</span>
                  )}
                </div>
                {result.question.hasAnswerKey ? (
                  <div className="quiz-review-block">
                    <p>Răspuns corect:</p>
                    <ul>
                      {(result.question.correctAnswers ?? []).map((answer) => (
                        <li key={answer}>
                          {formatAnswerWithLabel(result.question, answer)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="quiz-review-block">
                    <p>Evaluare:</p>
                    <span className="quiz-review-note">
                      Răspunsurile corecte pentru {result.question.sourceLabel} vor fi adăugate ulterior.
                    </span>
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentSelection = selectedAnswers[currentQuestion.uid] ?? [];
  const isCurrentReviewed = reviewedAnswers[currentQuestion.uid] ?? false;
  const isCurrentCorrect = currentQuestion.hasAnswerKey
    ? isExactMatch(currentSelection, currentQuestion.correctAnswers ?? [])
    : null;

  return (
    <div className="grile-wrapper">
      <div className="grile-card">
        <div className="grile-header grile-header-stack">
          <div>
            <span className="grile-badge">Simulare grile</span>
            <h2 className="grile-title">{currentQuestion.question}</h2>
            <p className="grile-subtitle">
              Întrebarea {currentIndex + 1} din {quizQuestions.length} · set: {currentQuestion.sourceLabel} · capitol: {currentQuestion.chapter} · {currentQuestion.hasAnswerKey
                ? "pot exista una sau mai multe variante corecte."
                : "baremul nu este disponibil încă pentru acest set."}
            </p>
          </div>
          <div className="grile-progress-box">
            <span className="grile-progress-count">
              {answeredCount} / {quizQuestions.length}
            </span>
            <span className="grile-progress-label">completate</span>
          </div>
        </div>

        <div className="grile-progress-bar" aria-hidden="true">
          <span
            className="grile-progress-bar-fill"
            style={{ width: `${((currentIndex + 1) / quizQuestions.length) * 100}%` }}
          />
        </div>

        <div className="chapter-filter-row">
          <label htmlFor="chapter-select" className="chapter-filter-label">
            Capitol
          </label>
          <select
            id="chapter-select"
            className="chapter-filter-select"
            value={selectedChapter}
            onChange={(event) => setSelectedChapter(event.target.value)}
          >
            <option value={ALL_CHAPTERS_VALUE}>Toate capitolele</option>
            {chapterOptions.map((chapter) => (
              <option key={chapter} value={chapter}>
                {chapter}
              </option>
            ))}
          </select>
          <span className="chapter-filter-count">
            {filteredQuestionPool.length} întrebări disponibile
          </span>
        </div>

        <div className="quiz-options">
          {currentQuestion.answers.map((answer, index) => {
            const optionLabel = String.fromCharCode(65 + index);
            const checked = currentSelection.includes(answer);
            const isCorrectAnswer = (currentQuestion.correctAnswers ?? []).includes(answer);

            const optionClasses = ["quiz-option"];

            if (checked) {
              optionClasses.push("quiz-option-selected");
            }

            if (currentQuestion.hasAnswerKey && isCurrentReviewed && isCorrectAnswer) {
              optionClasses.push("quiz-option-correct");
            } else if (
              currentQuestion.hasAnswerKey &&
              isCurrentReviewed &&
              checked &&
              !isCorrectAnswer
            ) {
              optionClasses.push("quiz-option-wrong");
            }

            return (
              <label
                key={answer}
                className={optionClasses.join(" ")}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleAnswer(answer)}
                  disabled={isCurrentReviewed}
                />
                <span className="quiz-option-letter">{optionLabel}</span>
                <span className="quiz-option-text">{answer}</span>
              </label>
            );
          })}
        </div>

        {isCurrentReviewed ? (
          currentQuestion.hasAnswerKey ? (
            <div
              className={`quiz-feedback ${
                isCurrentCorrect ? "quiz-feedback-correct" : "quiz-feedback-wrong"
              }`}
            >
              <div className="quiz-feedback-header">
                <span className="quiz-feedback-badge">
                  {isCurrentCorrect ? "✅ Corect" : "❌ Greșit"}
                </span>
                <p className="quiz-feedback-title">
                  {isCurrentCorrect
                    ? "Răspunsul tău este corect."
                    : "Răspunsul tău nu este corect."}
                </p>
              </div>

              {!isCurrentCorrect && currentSelection.length > 0 ? (
                <div className="quiz-feedback-block">
                  <p>Tu ai selectat:</p>
                  <ul>
                    {currentSelection.map((answer) => (
                      <li key={answer}>
                        {formatAnswerWithLabel(currentQuestion, answer)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="quiz-feedback-block">
                <p>Răspunsurile corecte erau:</p>
                <ul>
                  {(currentQuestion.correctAnswers ?? []).map((answer) => (
                    <li key={answer}>
                      {formatAnswerWithLabel(currentQuestion, answer)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="quiz-feedback quiz-feedback-pending">
              <div className="quiz-feedback-header">
                <span className="quiz-feedback-badge">ℹ️ Neevaluat</span>
                <p className="quiz-feedback-title">
                  Răspunsurile corecte pentru acest set vor fi adăugate ulterior.
                </p>
              </div>

              <div className="quiz-feedback-block">
                <p>Tu ai selectat:</p>
                {currentSelection.length > 0 ? (
                  <ul>
                    {currentSelection.map((answer) => (
                      <li key={answer}>
                        {formatAnswerWithLabel(currentQuestion, answer)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="quiz-review-empty">Nu ai selectat niciun răspuns.</span>
                )}
              </div>
            </div>
          )
        ) : null}
      </div>

      <div className="card-nav">
        <button
          className="nav-btn"
          onClick={() => setCurrentIndex((index) => Math.max(index - 1, 0))}
          disabled={currentIndex === 0}
        >
          ← Anterior
        </button>

        <div className="dots">
          {quizQuestions.map((question, index) => (
            <span
              key={question.uid}
              className={`dot ${index === currentIndex ? "dot-active" : ""} ${
                reviewedAnswers[question.uid] ? "dot-answered" : ""
              }`}
            />
          ))}
        </div>

        {!isCurrentReviewed ? (
          <button
            className="nav-btn"
            onClick={handleCheckAnswer}
            disabled={currentSelection.length === 0}
          >
            {currentQuestion.hasAnswerKey ? "Verifică" : "Marchează ca rezolvat"}
          </button>
        ) : currentIndex === quizQuestions.length - 1 ? (
          <button className="nav-btn" onClick={handleSubmitQuiz}>
            ✅ Finalizează
          </button>
        ) : (
          <button className="nav-btn" onClick={goToNextQuestion}>
            Continuă →
          </button>
        )}
      </div>

      <div className="quiz-actions quiz-actions-bottom">
        <button className="nav-btn nav-btn-warning" onClick={handleBlockCurrentQuestion}>
          🚫 Blochează întrebarea
        </button>
        <button className="nav-btn nav-btn-secondary" onClick={handleRetake}>
          🔄 Întrebări noi
        </button>
      </div>
    </div>
  );
};

export default GrileCard;

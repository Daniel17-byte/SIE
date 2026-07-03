import { useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { studyModes } from "./data/questions";
import type { Question } from "./data/questions";
import QuestionCard from "./components/QuestionCard";
import MergedQuestionsModal from "./components/MergedQuestionsModal";
import StudySearchTab from "./components/StudySearchTab";
import type { StudySource } from "./components/StudySearchTab";
import GrileCard from "./components/GrileCard";
import type { SimulationSummary } from "./components/GrileCard";
import ExamSimulationTab from "./components/ExamSimulationTab";
import "./App.css";

type Tab = "intrebari" | "grile" | "merged" | "simulare-examen";
type StudyMode = (typeof studyModes)[number];

type OpenQuestionSetKey = Exclude<StudyMode, "complet">;

const OPEN_QUESTION_FILES: Record<OpenQuestionSetKey, string> = {
  partial: "/intrebari-deschise-partial.json",
  examen: "/intrebari-deschise-examen.json",
};

const MODE_META: Record<
  StudyMode,
  {
    label: string;
    title: string;
    description: string;
  }
> = {
  partial: {
    label: "Partial",
    title: "SIE",
    description: "grile 1",
  },
  examen: {
    label: "Examen",
    title: "SIE",
    description: "grile 2",
  },
  complet: {
    label: "Complet",
    title: "SIE",
    description: "Full",
  },
};

const GRILE_SOURCES = {
  partial: [
    {
      id: "grile-1",
      path: "/grile.json",
      label: "Grile 1",
      hasAnswerKey: true,
    },
  ],
  examen: [
    {
      id: "grile-2",
      path: "/grile2.json",
      label: "Grile 2",
      hasAnswerKey: true,
    },
  ],
  complet: [
    {
      id: "grile-1",
      path: "/grile.json",
      label: "Grile 1",
      hasAnswerKey: true,
    },
    {
      id: "grile-2",
      path: "/grile2.json",
      label: "Grile 2",
      hasAnswerKey: true,
    },
  ],
} as const;

const EMPTY_QUESTION_SETS: Record<OpenQuestionSetKey, Question[]> = {
  partial: [],
  examen: [],
};

const STATS_FILE_SUGGESTED_NAME = "statistici-grile.txt";
const ALL_OPEN_CHAPTERS_VALUE = "__all_open__";
const DEFAULT_OPEN_CHAPTER = "Introducere";
const MERGED_COURSE_TEXT_PATH = "/ilovepdf_merged.txt";
const MERGED_COURSE_PDF_PATH = "/ilovepdf_merged.pdf";
const OPEN_BLOCKED_QUESTIONS_KEY_PREFIX = "sie-app:open-blocked:";

type OpenQuestionWithChapter = Question & { chapter: string; uid: string };

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const COURSE_CHAPTERS = [
  "Adaptoare Grafice",
  "Afisaje",
  "Discuri Optice",
  "Metode IE",
  "Magistrale",
  "Introducere",
  "Module Extensie",
] as const;

const LEGACY_TO_COURSE_CHAPTER: Record<string, (typeof COURSE_CHAPTERS)[number]> = {
  "Intreruperi": "Metode IE",
  "DMA si transferuri I/E": "Metode IE",
  "Magistrale si interconectare": "Magistrale",
  "PCI / PCI Express / CompactPCI": "Magistrale",
  "Module embedded": "Module Extensie",
  "GPU si CUDA": "Adaptoare Grafice",
  "Afisaje": "Afisaje",
  "Stocare optica": "Discuri Optice",
  "Arhitectura calculatoarelor": "Introducere",
  "Diverse": "Introducere",
};

const SOURCE_CHAPTER_RULES: Array<{ chapter: (typeof COURSE_CHAPTERS)[number]; patterns: string[] }> = [
  { chapter: "Adaptoare Grafice", patterns: ["adaptoare-grafice"] },
  { chapter: "Afisaje", patterns: ["afisaje"] },
  { chapter: "Discuri Optice", patterns: ["discuri-optice"] },
  { chapter: "Metode IE", patterns: ["metode-ie"] },
  { chapter: "Magistrale", patterns: ["magistrale"] },
  { chapter: "Introducere", patterns: ["introducere"] },
  { chapter: "Module Extensie", patterns: ["module-extensie"] },
];

const OPEN_CHAPTER_RULES: Array<{ chapter: string; patterns: string[] }> = [
  {
    chapter: "Adaptoare Grafice",
    patterns: ["cuda", "gpu", "gddr", "hbm", "adaptor grafic"],
  },
  {
    chapter: "Afisaje",
    patterns: ["afisaj", "display", "lcd", "oled", "amoled", "ips", "tn", "mva", "stn", "quantum dot", "e-paper", "tmds", "hdmi"],
  },
  {
    chapter: "Discuri Optice",
    patterns: ["disc", "cd", "dvd", "blu-ray", "pit", "land", "laser", "toc", "msf", "atapi"],
  },
  {
    chapter: "Metode IE",
    patterns: ["dma", "intrerup", "polling", "iack", "ireq", "adresare", "mapare in memorie", "procesor de i/e", "pie"],
  },
  {
    chapter: "Magistrale",
    patterns: ["magistral", "pci", "pcie", "usb", "spi", "i2c", "smbus", "serial", "paralel", "vme", "vxs", "displayport"],
  },
  {
    chapter: "Module Extensie",
    patterns: ["compactpci", "com express", "fmc", "mezzanin", "mezanin", "xmc", "picmg", "module de extensie"],
  },
  {
    chapter: "Introducere",
    patterns: ["introducere", "sistem de intrare/iesire"],
  },
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferOpenQuestionChapter(question: Question) {
  if (typeof question.chapter === "string" && question.chapter.trim().length > 0) {
    const trimmedChapter = question.chapter.trim();
    if ((COURSE_CHAPTERS as readonly string[]).includes(trimmedChapter)) {
      return trimmedChapter;
    }

    if (trimmedChapter in LEGACY_TO_COURSE_CHAPTER) {
      return LEGACY_TO_COURSE_CHAPTER[trimmedChapter];
    }
  }

  const sourceText = normalizeText(question.source ?? "");
  for (const rule of SOURCE_CHAPTER_RULES) {
    if (rule.patterns.some((pattern) => sourceText.includes(normalizeText(pattern)))) {
      return rule.chapter;
    }
  }

  const searchableText = normalizeText(
    [question.title, question.source, question.content].filter(Boolean).join(" ")
  );

  for (const rule of OPEN_CHAPTER_RULES) {
    const hasMatch = rule.patterns.some((pattern) =>
      searchableText.includes(normalizeText(pattern))
    );

    if (hasMatch) {
      return rule.chapter;
    }
  }

  return DEFAULT_OPEN_CHAPTER;
}

function getOpenBlockedQuestionsKey(mode: StudyMode) {
  return `${OPEN_BLOCKED_QUESTIONS_KEY_PREFIX}${mode}`;
}

function getOpenQuestionUid(question: Question) {
  return `${question.source}::${question.id}::${question.title}`;
}

function readBlockedOpenQuestionIds(storageKey: string) {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const rawBlockedIds = window.sessionStorage.getItem(storageKey);
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

function writeBlockedOpenQuestionIds(storageKey: string, questionIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify([...new Set(questionIds)]));
  } catch {
    // Ignore storage write failures and continue with in-memory filtering.
  }
}

type PickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<FileSystemFileHandle>;
};

function supportsFilePickerApi() {
  return (
    typeof window !== "undefined" &&
    typeof (window as PickerWindow).showSaveFilePicker === "function"
  );
}

async function ensureFilePermission(handle: FileSystemFileHandle) {
  const readWriteMode = { mode: "readwrite" as const };
  const permissionHandle = handle as FileSystemFileHandle & {
    queryPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
    requestPermission?: (descriptor: { mode: "readwrite" }) => Promise<PermissionState>;
  };

  if (!permissionHandle.queryPermission || !permissionHandle.requestPermission) {
    return true;
  }

  if ((await permissionHandle.queryPermission(readWriteMode)) === "granted") {
    return true;
  }

  return (await permissionHandle.requestPermission(readWriteMode)) === "granted";
}

async function appendStatsEntry(handle: FileSystemFileHandle, entry: string) {
  const hasPermission = await ensureFilePermission(handle);
  if (!hasPermission) {
    throw new Error("Permisiunea de scriere pentru fișierul de statistici a fost refuzată.");
  }

  const existingFile = await handle.getFile();
  const writable = await handle.createWritable({ keepExistingData: true });

  await writable.seek(existingFile.size);
  const prefix = existingFile.size > 0 ? "\n" : "";
  await writable.write(`${prefix}${entry}\n`);
  await writable.close();
}

function formatStatsEntry(summary: SimulationSummary) {
  const completedDate = new Date(summary.completedAt).toLocaleString("ro-RO");
  const chapterLines = summary.chapterScores
    .map((chapter) => {
      const ratio =
        chapter.evaluatedQuestions > 0
          ? `${chapter.correctAnswers}/${chapter.evaluatedQuestions} (${chapter.percentage}%)`
          : `neevaluat (${chapter.totalQuestions} întrebări)`;
      return `- ${chapter.chapter}: ${ratio}`;
    })
    .join("\n");

  return [
    "------------------------------------------------------------",
    `Data: ${completedDate}`,
    `Mod: ${summary.modeLabel.toLowerCase()}`,
    `Set: ${summary.sourceLabels}`,
    `Filtru capitol: ${summary.selectedChapterLabel}`,
    `Nr întrebări: ${summary.questionCount}`,
    `Scor total: ${summary.score}/${summary.evaluatedCount}`,
    `Precizie: ${summary.percentage !== null ? `${summary.percentage}%` : "neevaluat"}`,
    "Scor pe capitole:",
    chapterLines.length > 0 ? chapterLines : "- (fără date)",
  ].join("\n");
}

async function fetchQuestionSet(filePath: string) {
  const response = await fetch(filePath);

  if (!response.ok) {
    throw new Error(`Nu am putut încărca întrebările din ${filePath}.`);
  }

  const data = (await response.json()) as Question[];
  if (!Array.isArray(data)) {
    throw new Error(`Fișierul ${filePath} nu conține întrebări valide.`);
  }

  return data;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("merged");
  const [mode, setMode] = useState<StudyMode>("complet");
  const [qIndex, setQIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [questionSets, setQuestionSets] = useState(EMPTY_QUESTION_SETS);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [selectedOpenChapter, setSelectedOpenChapter] = useState(ALL_OPEN_CHAPTERS_VALUE);
  const [isMergedModalOpen, setIsMergedModalOpen] = useState(false);
  const [mergedCourseText, setMergedCourseText] = useState("");
  const [mergedCourseError, setMergedCourseError] = useState<string | null>(null);
  const [mergedStudySource, setMergedStudySource] = useState<StudySource>("intrebari");
  const [mergedSearchQuery, setMergedSearchQuery] = useState("");
  const [statsFileHandle, setStatsFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [statsStatus, setStatsStatus] = useState(
    "Conecteaza fisierul de statistici pentru salvare automata."
  );
  const [blockedOpenQuestionIds, setBlockedOpenQuestionIds] = useState<string[]>([]);
  const [isNavCompact, setIsNavCompact] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const blockedOpenQuestionsKey = useMemo(() => getOpenBlockedQuestionsKey(mode), [mode]);

  const blockedOpenQuestionSet = useMemo(
    () => new Set(blockedOpenQuestionIds),
    [blockedOpenQuestionIds]
  );

  useEffect(() => {
    setBlockedOpenQuestionIds(readBlockedOpenQuestionIds(blockedOpenQuestionsKey));
  }, [blockedOpenQuestionsKey]);

  useEffect(() => {
    writeBlockedOpenQuestionIds(blockedOpenQuestionsKey, blockedOpenQuestionIds);
  }, [blockedOpenQuestionIds, blockedOpenQuestionsKey]);

  const allModeQuestions = useMemo<OpenQuestionWithChapter[]>(() => {
    if (mode === "partial") {
      return questionSets.partial.map((question) => ({
        ...question,
        uid: getOpenQuestionUid(question),
        chapter: inferOpenQuestionChapter(question),
      }));
    }

    if (mode === "examen") {
      return questionSets.examen.map((question) => ({
        ...question,
        uid: getOpenQuestionUid(question),
        chapter: inferOpenQuestionChapter(question),
      }));
    }

    return [...questionSets.partial, ...questionSets.examen].map((question) => ({
      ...question,
      uid: getOpenQuestionUid(question),
      chapter: inferOpenQuestionChapter(question),
    }));
  }, [mode, questionSets]);

  const availableOpenQuestions = useMemo(
    () => allModeQuestions.filter((question) => !blockedOpenQuestionSet.has(question.uid)),
    [allModeQuestions, blockedOpenQuestionSet]
  );

  const openChapterOptions = useMemo(
    () =>
      Array.from(new Set(availableOpenQuestions.map((question) => question.chapter))).sort((a, b) =>
        a.localeCompare(b, "ro")
      ),
    [availableOpenQuestions]
  );

  useEffect(() => {
    if (
      selectedOpenChapter !== ALL_OPEN_CHAPTERS_VALUE &&
      !openChapterOptions.includes(selectedOpenChapter)
    ) {
      setSelectedOpenChapter(ALL_OPEN_CHAPTERS_VALUE);
    }
  }, [openChapterOptions, selectedOpenChapter]);

  const questions = useMemo(
    () =>
      selectedOpenChapter === ALL_OPEN_CHAPTERS_VALUE
        ? availableOpenQuestions
        : availableOpenQuestions.filter((question) => question.chapter === selectedOpenChapter),
    [availableOpenQuestions, selectedOpenChapter]
  );

  const safeQIndex = Math.min(qIndex, Math.max(questions.length - 1, 0));
  const currentQuestion = questions[safeQIndex] ?? null;
  const currentModeMeta = MODE_META[mode];

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const onScroll = () => setIsNavCompact(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 640) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadQuestionSets() {
      try {
        setIsLoadingQuestions(true);
        setQuestionError(null);

        const [partialQuestions, examenQuestions] = await Promise.all([
          fetchQuestionSet(OPEN_QUESTION_FILES.partial),
          fetchQuestionSet(OPEN_QUESTION_FILES.examen),
        ]);

        if (!isMounted) {
          return;
        }

        setQuestionSets({
          partial: partialQuestions,
          examen: examenQuestions,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setQuestionError(
          error instanceof Error
            ? error.message
            : "A apărut o eroare la încărcarea întrebărilor deschise."
        );
      } finally {
        if (isMounted) {
          setIsLoadingQuestions(false);
        }
      }
    }

    loadQuestionSets();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMergedCourseText() {
      try {
        setMergedCourseError(null);
        const response = await fetch(MERGED_COURSE_TEXT_PATH);

        if (!response.ok) {
          throw new Error("Nu am putut încărca textul cursului merged.");
        }

        const text = await response.text();
        if (!isMounted) {
          return;
        }

        setMergedCourseText(text);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMergedCourseError(
          error instanceof Error ? error.message : "A apărut o eroare la încărcarea cursului merged."
        );
      }
    }

    loadMergedCourseText();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (tab === "intrebari" && questions.length > 0 && e.key === "ArrowLeft") {
        setQIndex((i) => Math.max(i - 1, 0));
      } else if (
        tab === "intrebari" &&
        questions.length > 0 &&
        e.key === "ArrowRight"
      ) {
        setQIndex((i) => Math.min(i + 1, questions.length - 1));
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    },
    [questions.length, tab, toggleFullscreen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  useEffect(() => {
    setQIndex(0);
  }, [selectedOpenChapter]);

  useEffect(() => {
    if (tab !== "intrebari") {
      setIsMergedModalOpen(false);
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== "merged") {
      setMergedSearchQuery("");
    }
  }, [tab]);

  const questionCountBadge = isLoadingQuestions
    ? "..."
    : questionError
      ? "!"
      : availableOpenQuestions.length;

  const selectedOpenChapterLabel =
    selectedOpenChapter === ALL_OPEN_CHAPTERS_VALUE
      ? "Toate capitolele"
      : selectedOpenChapter;

  const grileHint =
    mode === "partial"
      ? "Simulare cu 10 întrebări aleatoare din grile 1 · poți filtra pe capitole · verifici fiecare răspuns înainte de continuare · "
      : mode === "examen"
        ? "Simulare cu 10 întrebări aleatoare din grile 2 · poți filtra pe capitole · verifici fiecare răspuns înainte de continuare · "
        : "Simulare mixtă din grile 1 + grile 2 · poți filtra pe capitole · verifici fiecare răspuns înainte de continuare · ";

  const mergedHint =
    "Alege sursa Curs / Întrebări deschise și caută rapid în materialul merged sau în întrebările filtrate curent · ";

  const examHint =
    "Simulare examen pe 2 părți: Partial (9 grile + 8 deschise) / Examen (9 grile + 11 deschise) · random nou la fiecare sesiune · ";

  const connectStatsFile = useCallback(async () => {
    if (!supportsFilePickerApi()) {
      setStatsStatus("Browserul nu suporta scriere directa in fisier. Incearca Chrome sau Edge.");
      return;
    }

    try {
      const picker = (window as PickerWindow).showSaveFilePicker;
      if (!picker) {
        setStatsStatus("API-ul de acces la fisiere nu este disponibil in aceasta sesiune.");
        return;
      }

      const handle = await picker({
        suggestedName: STATS_FILE_SUGGESTED_NAME,
        types: [
          {
            description: "Fisier text",
            accept: {
              "text/plain": [".txt"],
            },
          },
        ],
      });

      const hasPermission = await ensureFilePermission(handle);
      if (!hasPermission) {
        setStatsStatus("Fisier conectat, dar fara permisiune de scriere.");
        return;
      }

      setStatsFileHandle(handle);
      setStatsStatus(`Fisier conectat: ${handle.name}`);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setStatsStatus("Nu am putut conecta fisierul de statistici.");
    }
  }, []);

  const handleSimulationComplete = useCallback(
    async (summary: SimulationSummary) => {
      const entry = formatStatsEntry(summary);

      if (!statsFileHandle) {
        setStatsStatus("Simularea s-a incheiat, dar fisierul de statistici nu este conectat.");
        return;
      }

      try {
        await appendStatsEntry(statsFileHandle, entry);
        setStatsStatus(`Salvat automat (${new Date().toLocaleTimeString("ro-RO")})`);
      } catch (error) {
        setStatsStatus(
          error instanceof Error
            ? `Eroare la salvare: ${error.message}`
            : "Eroare necunoscuta la salvare."
        );
      }
    },
    [statsFileHandle]
  );

  const handleCustomStatsEntry = useCallback(
    async (entry: string) => {
      if (!statsFileHandle) {
        setStatsStatus("Statistica nu a fost salvata pentru ca fisierul nu este conectat.");
        return;
      }

      try {
        await appendStatsEntry(statsFileHandle, entry);
        setStatsStatus(`Salvat automat (${new Date().toLocaleTimeString("ro-RO")})`);
      } catch (error) {
        setStatsStatus(
          error instanceof Error
            ? `Eroare la salvare: ${error.message}`
            : "Eroare necunoscuta la salvare."
        );
      }
    },
    [statsFileHandle]
  );

  const handleBlockCurrentOpenQuestion = useCallback(() => {
    if (!currentQuestion) {
      return;
    }

    setBlockedOpenQuestionIds((prev) => {
      if (prev.includes(currentQuestion.uid)) {
        return prev;
      }

      return [...prev, currentQuestion.uid];
    });

    setQIndex((index) => {
      if (questions.length <= 1) {
        return 0;
      }

      return Math.min(index, questions.length - 2);
    });
  }, [currentQuestion, questions.length]);

  return (
    <div className="app">
      <header
        className={`app-header ${isNavCompact ? "app-header-compact" : ""} ${
          isMobileMenuOpen ? "app-header-mobile-open" : ""
        }`}
      >
        <div className="navbar-top">
          <div className="app-title">
            <span className="app-logo" aria-hidden="true">
              <NavIcon>
                <path d="M4.5 6.5a2 2 0 0 1 2-2h10.2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2z" />
                <path d="M8 4.5v15" />
                <path d="M10.8 8.5h5" />
                <path d="M10.8 12h5" />
              </NavIcon>
            </span>
            <div>
              <h1>{currentModeMeta.title}</h1>
              <p className="app-subtitle">
                Sisteme de Intrare/Ieșire și Echipamente Periferice
              </p>
              <p className="app-mode-description">{currentModeMeta.description}</p>
            </div>
          </div>

          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label={isMobileMenuOpen ? "Închide meniul" : "Deschide meniul"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
          >
            <NavIcon>
              {isMobileMenuOpen ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </>
              ) : (
                <>
                  <path d="M4.5 7h15" />
                  <path d="M4.5 12h15" />
                  <path d="M4.5 17h15" />
                </>
              )}
            </NavIcon>
            <span>{isMobileMenuOpen ? "Închide" : "Meniu"}</span>
          </button>

          <div className="navbar-controls">
            <div className="mode-picker">
              <label className="mode-picker-label" htmlFor="study-mode-select">
                Mod
              </label>
              <select
                id="study-mode-select"
                className="mode-select"
                aria-label="Selectează setul de învățare"
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value as StudyMode);
                  setQIndex(0);
                  setIsMobileMenuOpen(false);
                }}
              >
                {studyModes.map((studyMode) => (
                  <option key={studyMode} value={studyMode}>
                    {MODE_META[studyMode].label}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="tab-btn nav-action-btn"
              onClick={() => {
                void connectStatsFile();
                setIsMobileMenuOpen(false);
              }}
            >
              <NavIcon>
                <path d="M8 4.5h6.8L19 8.7v10.8a1.8 1.8 0 0 1-1.8 1.8H8a1.8 1.8 0 0 1-1.8-1.8V6.3A1.8 1.8 0 0 1 8 4.5z" />
                <path d="M14.8 4.5v4.2H19" />
                <path d="M9.5 12.2h6" />
                <path d="M9.5 15.4h6" />
              </NavIcon>
              <span>Statistici</span>
            </button>

            <button
              className="tab-btn nav-action-btn fullscreen-btn"
              onClick={() => {
                toggleFullscreen();
                setIsMobileMenuOpen(false);
              }}
              title={isFullscreen ? "Ieși din full screen (F)" : "Full screen (F)"}
            >
              <NavIcon>
                {isFullscreen ? (
                  <>
                    <path d="M9 5.5H5.5V9" />
                    <path d="M15 5.5h3.5V9" />
                    <path d="M9 18.5H5.5V15" />
                    <path d="M15 18.5h3.5V15" />
                  </>
                ) : (
                  <>
                    <path d="M9 5.5H5.5V9" />
                    <path d="M15 5.5h3.5V9" />
                    <path d="M9 18.5H5.5V15" />
                    <path d="M15 18.5h3.5V15" />
                    <path d="M8.8 8.8L5.5 5.5" />
                    <path d="M15.2 8.8l3.3-3.3" />
                    <path d="M8.8 15.2l-3.3 3.3" />
                    <path d="M15.2 15.2l3.3 3.3" />
                  </>
                )}
              </NavIcon>
              <span>{isFullscreen ? "Ieși FS" : "Full Screen"}</span>
            </button>
          </div>
        </div>

        <div className="navbar-bottom">
          <div className="tabs" role="tablist" aria-label="Navigare secțiuni">
            <button
              className={`tab-btn ${tab === "intrebari" ? "tab-active" : ""}`}
              onClick={() => {
                setTab("intrebari");
                setIsMobileMenuOpen(false);
              }}
            >
              <NavIcon>
                <path d="M4.8 16.8l-.6 3.7 3.7-.6L18.6 9.2a1.8 1.8 0 0 0 0-2.6l-1.2-1.2a1.8 1.8 0 0 0-2.6 0z" />
                <path d="M13.6 6.2l4.2 4.2" />
              </NavIcon>
              <span>Întrebări Deschise</span>
              <span className="tab-count">{questionCountBadge}</span>
            </button>
            <button
              className={`tab-btn ${tab === "merged" ? "tab-active" : ""}`}
              onClick={() => {
                setTab("merged");
                setIsMobileMenuOpen(false);
              }}
            >
              <NavIcon>
                <path d="M4.5 6.5a2 2 0 0 1 2-2h10.2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2z" />
                <path d="M8 4.5v15" />
                <path d="M10.8 8.5h5" />
                <path d="M10.8 12h5" />
              </NavIcon>
              <span>Curs Merged</span>
              <span className="tab-count">search</span>
            </button>
            <button
              className={`tab-btn tab-teal ${
                tab === "grile" ? "tab-active-teal" : ""
              }`}
              onClick={() => {
                setTab("grile");
                setIsMobileMenuOpen(false);
              }}
            >
              <NavIcon>
                <rect x="5" y="4.8" width="14" height="16" rx="2" />
                <path d="M9 9.2h6" />
                <path d="M9 12.3h6" />
                <path d="M9 15.4h4" />
              </NavIcon>
              <span>Simulare Grile</span>
              <span className="tab-count">10 random</span>
            </button>
            <button
              className={`tab-btn tab-purple ${
                tab === "simulare-examen" ? "tab-active-purple" : ""
              }`}
              onClick={() => {
                setTab("simulare-examen");
                setIsMobileMenuOpen(false);
              }}
            >
              <NavIcon>
                <path d="M7 5.2h10a1.8 1.8 0 0 1 1.8 1.8v11a1.8 1.8 0 0 1-1.8 1.8H7A1.8 1.8 0 0 1 5.2 18V7A1.8 1.8 0 0 1 7 5.2z" />
                <path d="M9 9.2h6" />
                <path d="M9 12.4h6" />
                <path d="M9 15.6h3.5" />
              </NavIcon>
              <span>Simulare Examen</span>
              <span className="tab-count">2 părți</span>
            </button>
          </div>

          <span className="stats-status" title={statsStatus}>{statsStatus}</span>
        </div>
      </header>

      <main className="app-main">
        <div className="keyboard-hint">
          {tab === "intrebari" ? (
            <>
              Navighează cu ← → sau cu butoanele de mai jos &nbsp;·&nbsp; <kbd>F</kbd> = full screen
            </>
          ) : tab === "merged" ? (
            <>
              {mergedHint}
              <kbd>F</kbd> = full screen
            </>
          ) : tab === "simulare-examen" ? (
            <>
              {examHint}
              <kbd>F</kbd> = full screen
            </>
          ) : (
            <>
              {grileHint}
              <kbd>F</kbd> = full screen
            </>
          )}
        </div>

        {tab === "intrebari" && !isLoadingQuestions && !questionError ? (
          <div className="open-chapter-filter-row">
            <label htmlFor="open-chapter-select" className="open-chapter-filter-label">
              Capitol
            </label>
            <select
              id="open-chapter-select"
              className="open-chapter-filter-select"
              value={selectedOpenChapter}
              onChange={(event) => setSelectedOpenChapter(event.target.value)}
            >
              <option value={ALL_OPEN_CHAPTERS_VALUE}>Toate capitolele</option>
              {openChapterOptions.map((chapter) => (
                <option key={chapter} value={chapter}>
                  {chapter}
                </option>
              ))}
            </select>
            <span className="open-chapter-filter-count">
              {questions.length} întrebări disponibile
            </span>
            <button
              className="tab-btn open-merged-btn"
              onClick={() => setIsMergedModalOpen(true)}
              disabled={questions.length === 0}
            >
              📚 Vezi cursul merged
            </button>
          </div>
        ) : null}

        {tab === "intrebari" ? (
          isLoadingQuestions ? (
            <section className="app-status-card">
              <span className="app-status-badge">Întrebări deschise</span>
              <h2 className="app-status-title">Se încarcă setul selectat…</h2>
              <p className="app-status-text">
                Pregătesc întrebările pentru modul {currentModeMeta.label.toLowerCase()}.
              </p>
            </section>
          ) : questionError ? (
            <section className="app-status-card">
              <span className="app-status-badge app-status-badge-error">Eroare</span>
              <h2 className="app-status-title">Nu am putut încărca întrebările</h2>
              <p className="app-status-text">{questionError}</p>
              <button className="tab-btn app-status-action" onClick={() => window.location.reload()}>
                Reîncarcă
              </button>
            </section>
          ) : currentQuestion ? (
            <QuestionCard
              question={currentQuestion}
              current={safeQIndex}
              total={questions.length}
              onPrev={() => setQIndex((i) => Math.max(i - 1, 0))}
              onNext={() =>
                setQIndex((i) => Math.min(i + 1, questions.length - 1))
              }
              onBlockCurrent={handleBlockCurrentOpenQuestion}
            />
          ) : (
            <section className="app-status-card">
              <span className="app-status-badge">Întrebări deschise</span>
              <h2 className="app-status-title">Nu există întrebări în acest set</h2>
              <p className="app-status-text">
                {selectedOpenChapter === ALL_OPEN_CHAPTERS_VALUE
                  ? "Verifică fișierele JSON și încearcă din nou."
                  : `Nu există întrebări în capitolul \"${selectedOpenChapter}\" pentru modul ${currentModeMeta.label.toLowerCase()}.`}
              </p>
            </section>
          )
        ) : tab === "merged" ? (
          mergedStudySource === "intrebari" && isLoadingQuestions ? (
            <section className="app-status-card">
              <span className="app-status-badge">Întrebări deschise</span>
              <h2 className="app-status-title">Se încarcă întrebările pentru căutare…</h2>
              <p className="app-status-text">
                Pregătesc întrebările pentru modul {currentModeMeta.label.toLowerCase()}.
              </p>
            </section>
          ) : mergedStudySource === "intrebari" && questionError ? (
            <section className="app-status-card">
              <span className="app-status-badge app-status-badge-error">Eroare</span>
              <h2 className="app-status-title">Nu am putut încărca întrebările deschise</h2>
              <p className="app-status-text">{questionError}</p>
              <button className="tab-btn app-status-action" onClick={() => window.location.reload()}>
                Reîncarcă
              </button>
            </section>
          ) : mergedStudySource === "curs" && mergedCourseError ? (
            <section className="app-status-card">
              <span className="app-status-badge app-status-badge-error">Eroare</span>
              <h2 className="app-status-title">Nu am putut încărca cursul merged</h2>
              <p className="app-status-text">{mergedCourseError}</p>
            </section>
          ) : (
            <StudySearchTab
              mergedCourseText={mergedCourseText}
              mergedCoursePdfPath={MERGED_COURSE_PDF_PATH}
              questions={questions}
              source={mergedStudySource}
              query={mergedSearchQuery}
              onSourceChange={setMergedStudySource}
              onQueryChange={setMergedSearchQuery}
            />
          )
        ) : (
          tab === "grile" ? (
            <GrileCard
              modeLabel={currentModeMeta.label}
              sources={GRILE_SOURCES[mode]}
              onSimulationComplete={handleSimulationComplete}
            />
          ) : (
            <ExamSimulationTab
              partialOpenQuestions={questionSets.partial}
              examenOpenQuestions={questionSets.examen}
              grileSources={{
                partial: GRILE_SOURCES.partial,
                examen: GRILE_SOURCES.examen,
              }}
              onSimulationComplete={handleSimulationComplete}
              onSaveExamStats={handleCustomStatsEntry}
              isLoadingOpenQuestions={isLoadingQuestions}
              openQuestionError={questionError}
            />
          )
        )}
      </main>

      <MergedQuestionsModal
        isOpen={isMergedModalOpen}
        questions={questions}
        modeLabel={currentModeMeta.label}
        selectedChapterLabel={selectedOpenChapterLabel}
        onClose={() => setIsMergedModalOpen(false)}
      />

      <footer className="app-footer">
        <span>SIE • {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

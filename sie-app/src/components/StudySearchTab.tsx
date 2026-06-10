import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Question } from "../data/questions";
import "./StudySearchTab.css";

export type StudySource = "curs" | "intrebari";

interface Props {
  mergedCourseText: string;
  mergedCoursePdfPath: string;
  questions: Question[];
  source: StudySource;
  query: string;
  onSourceChange: (value: StudySource) => void;
  onQueryChange: (value: string) => void;
}

const MAX_COURSE_RESULTS = 80;
const MAX_OPEN_RESULTS = 50;

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildCourseChunks(text: string) {
  return text
    .split(/\f|\n\s*\n+/)
    .map((chunk) => compactWhitespace(chunk))
    .filter((chunk) => chunk.length >= 40);
}

function buildSnippet(chunk: string, query: string) {
  if (!query) {
    return chunk;
  }

  const normalizedChunk = normalizeSearchText(chunk);
  const normalizedQuery = normalizeSearchText(query);
  const matchIndex = normalizedChunk.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return chunk;
  }

  const start = Math.max(0, matchIndex - 100);
  const end = Math.min(chunk.length, matchIndex + query.length + 160);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < chunk.length ? "…" : "";
  return `${prefix}${chunk.slice(start, end).trim()}${suffix}`;
}

export default function StudySearchTab({
  mergedCourseText,
  mergedCoursePdfPath,
  questions,
  source,
  query,
  onSourceChange,
  onQueryChange,
}: Props) {
  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeSearchText(trimmedQuery);

  const courseChunks = useMemo(() => buildCourseChunks(mergedCourseText), [mergedCourseText]);

  const filteredCourseChunks = useMemo(() => {
    if (!normalizedQuery) {
      return [] as string[];
    }

    return courseChunks
      .filter((chunk) => normalizeSearchText(chunk).includes(normalizedQuery))
      .slice(0, MAX_COURSE_RESULTS);
  }, [courseChunks, normalizedQuery]);

  const filteredQuestions = useMemo(() => {
    if (!normalizedQuery) {
      return questions.slice(0, MAX_OPEN_RESULTS);
    }

    return questions
      .filter((question) =>
        normalizeSearchText(
          [question.title, question.chapter, question.source, question.content]
            .filter(Boolean)
            .join(" ")
        ).includes(normalizedQuery)
      )
      .slice(0, MAX_OPEN_RESULTS);
  }, [normalizedQuery, questions]);

  return (
    <div className="study-search-wrapper">
      <section className="study-search-card">
        <div className="study-search-header">
          <div>
            <span className="study-search-badge">Studiu merged</span>
            <h2 className="study-search-title">Curs / Întrebări deschise</h2>
            <p className="study-search-subtitle">
              Alege sursa și caută rapid în cursul merged sau în întrebările deschise din filtrul curent.
            </p>
          </div>
        </div>

        <div className="study-search-controls">
          <label className="study-search-control">
            <span>Sursă</span>
            <select
              className="study-search-select"
              value={source}
              onChange={(event) => onSourceChange(event.target.value as StudySource)}
            >
              <option value="curs">Curs</option>
              <option value="intrebari">Întrebări deschise</option>
            </select>
          </label>

          <label className="study-search-control study-search-control-wide">
            <span>Caută</span>
            <input
              className="study-search-input"
              type="search"
              placeholder={
                source === "curs"
                  ? "Caută în cursul merged..."
                  : "Caută în întrebările deschise..."
              }
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>
        </div>

        {source === "curs" ? (
          <div className="study-search-course-layout">
            <div className="study-search-panel">
              <div className="study-search-panel-header">
                <h3>Rezultate în curs</h3>
                <span>
                  {trimmedQuery
                    ? `${filteredCourseChunks.length} potriviri afișate`
                    : "Scrie un termen pentru a vedea potriviri"}
                </span>
              </div>

              <div className="study-search-results">
                {trimmedQuery ? (
                  filteredCourseChunks.length > 0 ? (
                    filteredCourseChunks.map((chunk, index) => (
                      <article key={`${index}-${chunk.slice(0, 30)}`} className="study-search-result-card">
                        <span className="study-search-result-index">#{index + 1}</span>
                        <p>{buildSnippet(chunk, trimmedQuery)}</p>
                      </article>
                    ))
                  ) : (
                    <p className="study-search-empty">Nu am găsit potriviri în cursul merged.</p>
                  )
                ) : (
                  <p className="study-search-empty">
                    Viewer-ul PDF este disponibil în dreapta. Introdu un termen ca să vezi rezultate textuale.
                  </p>
                )}
              </div>
            </div>

            <div className="study-search-viewer-card">
              <div className="study-search-panel-header">
                <h3>Viewer curs merged</h3>
                <a
                  className="study-search-link"
                  href={mergedCoursePdfPath}
                  target="_blank"
                  rel="noreferrer"
                >
                  Deschide PDF separat
                </a>
              </div>
              <iframe
                className="study-search-pdf"
                src={mergedCoursePdfPath}
                title="Curs merged"
              />
            </div>
          </div>
        ) : (
          <div className="study-search-panel study-search-questions-panel">
            <div className="study-search-panel-header">
              <h3>Rezultate în întrebările deschise</h3>
              <span>
                {trimmedQuery
                  ? `${filteredQuestions.length} rezultate afișate`
                  : `${filteredQuestions.length} întrebări din filtrul curent`}
              </span>
            </div>

            <div className="study-search-results">
              {filteredQuestions.length > 0 ? (
                filteredQuestions.map((question) => (
                  <article key={question.id} className="study-search-question-card">
                    <div className="study-search-question-meta">
                      <span className="study-search-result-index">#{question.id}</span>
                      <span className="study-search-question-chapter">📂 {question.chapter ?? "Introducere"}</span>
                    </div>
                    <h3 className="study-search-question-title">{question.title}</h3>
                    <p className="study-search-question-source">📖 Sursă: {question.source}</p>
                    <div className="study-search-question-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {question.content}
                      </ReactMarkdown>
                    </div>
                  </article>
                ))
              ) : (
                <p className="study-search-empty">
                  Nu există întrebări deschise care să corespundă căutării curente.
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}


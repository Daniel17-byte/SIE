import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Question } from "../data/questions";
import "./MergedQuestionsModal.css";

interface Props {
  isOpen: boolean;
  questions: Question[];
  modeLabel: string;
  selectedChapterLabel: string;
  onClose: () => void;
}

export default function MergedQuestionsModal({
  isOpen,
  questions,
  modeLabel,
  selectedChapterLabel,
  onClose,
}: Props) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="merged-modal-overlay" onClick={onClose} role="presentation">
      <section
        className="merged-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="merged-modal-title"
      >
        <div className="merged-modal-header">
          <div>
            <span className="merged-modal-badge">Curs merged</span>
            <h2 id="merged-modal-title" className="merged-modal-title">
              Întrebări deschise — {modeLabel}
            </h2>
            <p className="merged-modal-subtitle">
              {selectedChapterLabel} · {questions.length} întrebări afișate în ordine.
            </p>
          </div>

          <button className="merged-modal-close" onClick={onClose} aria-label="Închide modalul">
            ✕
          </button>
        </div>

        <div className="merged-modal-content">
          {questions.map((question, index) => (
            <article key={`${question.id}-${index}`} className="merged-question-card">
              <div className="merged-question-meta">
                <span className="merged-question-badge">Întrebarea {question.id}</span>
                <span className="merged-question-chapter">📂 {question.chapter ?? "Introducere"}</span>
              </div>
              <h3 className="merged-question-title">{question.title}</h3>
              <p className="merged-question-source">📖 Sursă: {question.source}</p>
              <div className="merged-question-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {question.content}
                </ReactMarkdown>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}


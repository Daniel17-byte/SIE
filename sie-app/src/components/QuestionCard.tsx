import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Question } from "../data/questions";
import "./QuestionCard.css";

interface Props {
  question: Question;
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function QuestionCard({
  question,
  current,
  total,
  onPrev,
  onNext,
}: Props) {
  return (
    <div className="card-wrapper">
      <div className="card">
        <div className="card-header">
          <span className="card-badge">Întrebarea {question.id}</span>
          <span className="card-counter">
            {current + 1} / {total}
          </span>
        </div>
        <h2 className="card-title">{question.title}</h2>
        <p className="card-chapter">📂 Capitol: {question.chapter ?? "Diverse"}</p>
        <p className="card-source">📖 Sursă: {question.source}</p>
        <div className="card-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {question.content}
          </ReactMarkdown>
        </div>
      </div>
      <div className="card-nav">
        <button
          className="nav-btn"
          onClick={onPrev}
          disabled={current === 0}
          aria-label="Anteriorul"
        >
          ← Anterior
        </button>
        <div className="dots">
          {Array.from({ length: Math.min(total, 10) }).map((_, i) => {
            const idx = Math.floor((current / total) * Math.min(total, 10));
            return (
              <span
                key={i}
                className={`dot ${i === idx ? "dot-active" : ""}`}
              />
            );
          })}
        </div>
        <button
          className="nav-btn"
          onClick={onNext}
          disabled={current === total - 1}
          aria-label="Următorul"
        >
          Următor →
        </button>
      </div>
    </div>
  );
}


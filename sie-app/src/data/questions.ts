export interface Question {
  id: number;
  title: string;
  source: string;
  content: string;
  chapter?: string;
}

export const studyModes = ["partial", "examen", "complet"] as const;

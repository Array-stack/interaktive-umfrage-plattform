
export enum QuestionType {
  TEXT = 'TEXT',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  RATING_SCALE = 'RATING_SCALE', // Typically 1-5
}

export interface Choice {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  choices?: Choice[]; // Only for SINGLE_CHOICE and MULTIPLE_CHOICE
  // For RATING_SCALE, min/max could be added, but defaulting to 1-5 for simplicity
}

export interface NewQuestion extends Omit<Question, 'id'> {
  id?: string; // Optional for new questions before saving
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  ownerId: string; // Simulated teacher ID
  questions: Question[];
  createdAt: string; // ISO date string
}

// Fix: Redefined NewSurvey to correctly specify its properties, avoiding problematic extension of Omit<Survey,...> for the 'questions' field.
// This ensures that NewSurvey.questions is explicitly NewQuestion[], aligning with its intended structure.
export interface NewSurvey {
  title: string;
  description: string;
  questions: NewQuestion[];
  // ownerId, id, createdAt are handled by the service or generated automatically.
}

export interface Answer {
  questionId: string;
  value: string | string[] | number; // string for TEXT, string for SINGLE_CHOICE, string[] for MULTIPLE_CHOICE, number for RATING_SCALE
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId: string; // Simulated respondent ID or unique marker
  answers: Answer[];
  submittedAt: string; // ISO date string
}

export interface NewSurveyResponse extends Omit<SurveyResponse, 'id' | 'submittedAt' | 'respondentId'> {
   respondentId?: string;
}

// For chart data
export interface ChartDataPoint {
  name: string;
  count: number;
}

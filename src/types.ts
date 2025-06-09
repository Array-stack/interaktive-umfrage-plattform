export interface Survey {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  questions: Question[];
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  choices: Array<{ id: string; text: string }>;
  required: boolean;
}

export enum QuestionType {
  TEXT = 'TEXT',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  RATING_SCALE = 'RATING_SCALE',
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId: string;
  answers: Answer[];
  submittedAt: string;
}

export interface Answer {
  questionId: string;
  value: string | string[] | number;
}

export interface NewSurvey {
  title: string;
  description?: string;
  isPublic: boolean;
  questions: NewQuestion[];
}

export interface NewQuestion {
  text: string;
  type: QuestionType;
  options?: string[];
  /** @deprecated Use options instead */
  choices?: Array<{ id: string; text: string }>;
  required: boolean;
}

export interface NewSurveyResponse {
  surveyId: string;
  answers: Array<{
    questionId: string;
    value: string | string[] | number;
  }>;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

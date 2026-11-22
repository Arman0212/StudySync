/**
 * StudySync domain model.
 *
 * Time representation (important for timezone safety):
 * - Calendar dates are plain strings "YYYY-MM-DD" in the student's local calendar.
 *   They are never parsed with `new Date("YYYY-MM-DD")` (which is UTC midnight and can
 *   shift a day). See `dates.ts`.
 * - Times of day are integers: minutes after local midnight (0..1440).
 */

export type ISODate = string; // "YYYY-MM-DD"
export type Minutes = number; // minutes after midnight, or a duration in minutes

/** 0 = Sunday ... 6 = Saturday (same as JS getUTCDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Difficulty = 'easy' | 'moderate' | 'hard';
export type Importance = 'low' | 'medium' | 'high';
export type TopicStatus = 'not_started' | 'in_progress' | 'completed';
export type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'missed' | 'rescheduled';
export type SubjectPriority = 'normal' | 'high';

export interface Profile {
  displayName: string;
  institution: string;
  timezone: string;
  planStart: ISODate;
}

export interface Availability {
  studyDays: Weekday[];
  dayStart: Minutes;
  dayEnd: Minutes;
  dailyMaxMinutes: Minutes;
  sessionLength: Minutes;
  shortBreak: Minutes;
  longBreak: Minutes;
  /** A long break is required after this many back-to-back sessions. */
  sessionsBeforeLongBreak: number;
}

export interface Commitment {
  id: string;
  label: string;
  /** 'once' uses `date`; 'weekly' uses `weekdays`. */
  repeat: 'once' | 'weekly';
  date?: ISODate;
  weekdays?: Weekday[];
  start: Minutes;
  end: Minutes;
}

export interface Subject {
  id: string;
  name: string;
  examDate: ISODate;
  /** Optional exam start time; when absent, the whole exam day is treated as unavailable. */
  examStart?: Minutes | null;
  priority: SubjectPriority;
  color: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  notes: string;
  difficulty: Difficulty;
  importance: Importance;
  estimatedMinutes: Minutes;
  status: TopicStatus;
  confidence?: number | null; // 1..5
  /** Order of creation, used as a stable tie-breaker. */
  order: number;
}

export interface RescheduleRecord {
  fromDate: ISODate;
  fromStart: Minutes;
  toDate: ISODate;
  toStart: Minutes;
  reason: string;
  at: string; // ISO timestamp (informational)
}

export interface StudySession {
  id: string;
  topicId: string;
  subjectId: string;
  date: ISODate;
  start: Minutes;
  duration: Minutes;
  status: SessionStatus;
  locked: boolean;
  actualMinutes?: number | null;
  note?: string;
  rescheduleCount: number;
  history: RescheduleRecord[];
}

export interface CapacityConflict {
  topicId: string;
  subjectId: string;
  neededMinutes: Minutes;
  /** Raw free study time before the exam (ignoring other subjects' work). */
  availableMinutes: Minutes;
  reason: 'no_capacity' | 'exam_before_start' | 'no_study_days';
}

export type ActivityKind =
  | 'session_completed'
  | 'session_missed'
  | 'session_edited'
  | 'session_deleted'
  | 'session_rescheduled'
  | 'session_locked'
  | 'topic_completed'
  | 'plan_generated'
  | 'mock_score'
  | 'data_imported';

export interface ActivityEntry {
  id: string;
  at: string; // ISO timestamp
  kind: ActivityKind;
  message: string;
  subjectId?: string;
  topicId?: string;
  sessionId?: string;
}

export type QuestionType = 'mcq' | 'short' | 'long' | 'numerical' | 'case';
export type MockDifficulty = 'easy' | 'moderate' | 'hard' | 'mixed';

export interface MockTestConfig {
  subjectId: string;
  topicIds: string[];
  questionCount: number;
  difficulty: MockDifficulty;
  questionTypes: QuestionType[];
  totalMarks?: number | null;
  timeLimitMinutes?: number | null;
  markingScheme: string;
  examInstructions: string;
}

export interface MockScore {
  id: string;
  subjectId: string;
  date: ISODate;
  scorePercent: number; // 0..100
  topicScores: Record<string, number>; // topicId -> percent
  note: string;
}

export interface AppData {
  profile: Profile | null;
  availability: Availability;
  commitments: Commitment[];
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  conflicts: CapacityConflict[];
  activity: ActivityEntry[];
  mockConfig: MockTestConfig | null;
  mockScores: MockScore[];
  /** True only when the data came from the "Load demo data" button. */
  isDemo: boolean;
}

/** Current wall-clock moment in the student's timezone, passed into pure logic. */
export interface LocalNow {
  date: ISODate;
  minutes: Minutes;
}

export const DEFAULT_AVAILABILITY: Availability = {
  studyDays: [1, 2, 3, 4, 5, 6],
  dayStart: 9 * 60,
  dayEnd: 21 * 60,
  dailyMaxMinutes: 5 * 60,
  sessionLength: 50,
  shortBreak: 10,
  longBreak: 30,
  sessionsBeforeLongBreak: 3,
};

export const SESSION_LENGTH_MIN = 25;
export const SESSION_LENGTH_MAX = 120;
/** Shortest session the scheduler will create unless the topic's remainder is smaller. */
export const MIN_SESSION_MINUTES = 25;

export function emptyAppData(): AppData {
  return {
    profile: null,
    availability: { ...DEFAULT_AVAILABILITY, studyDays: [...DEFAULT_AVAILABILITY.studyDays] },
    commitments: [],
    subjects: [],
    topics: [],
    sessions: [],
    conflicts: [],
    activity: [],
    mockConfig: null,
    mockScores: [],
    isDemo: false,
  };
}

/** Accessible subject palette (each passes AA for white text and as a 3:1 graphic against white). */
export const SUBJECT_COLORS: { value: string; name: string }[] = [
  { value: '#1f6f50', name: 'Forest' },
  { value: '#2563a8', name: 'Ocean' },
  { value: '#8a4fb0', name: 'Plum' },
  { value: '#b4471f', name: 'Terracotta' },
  { value: '#8a6a00', name: 'Ochre' },
  { value: '#0f7285', name: 'Teal' },
  { value: '#b0306a', name: 'Berry' },
  { value: '#4b5a6b', name: 'Slate' },
];

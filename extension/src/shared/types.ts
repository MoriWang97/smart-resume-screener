// ══════════════════════════════════════════════════════════
// 共享类型定义 - 与后端 Domain/Models 保持一致
// ══════════════════════════════════════════════════════════

/** 候选人简历数据 */
export interface ResumeData {
  name: string;
  currentTitle: string;
  workExperience: string;
  education: string;
  expectedSalary: string;
  age: string;
  location: string;
  skills: string[];
  workHistory: string;
  educationHistory: string;
  projectExperience: string;
  selfDescription: string;
  platform: string;
  profileUrl: string;
  rawText: string;
}

/** HR 筛选条件 */
export interface ScreeningCriteria {
  jobTitle: string;
  jobDescription: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperienceYears?: number;
  minEducation?: string;
  maxSalaryK?: number;
  minSalaryK?: number;
  preferredLocations: string[];
  additionalRequirements: string;
}

/** AI 筛选结果 */
export interface ScreeningResult {
  candidateName: string;
  overallScore: number;
  recommendation: RecommendationLevel;
  dimensionScores: DimensionScore[];
  strengths: string[];
  concerns: string[];
  summary: string;
  suggestedQuestions: string[];
}

export type RecommendationLevel =
  | 'StronglyRecommended'
  | 'Recommended'
  | 'MaybeConsider'
  | 'NotRecommended';

export interface DimensionScore {
  dimension: string;
  score: number;
  comment: string;
}

/** API 响应包装 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ══════════════════════════════════════════════════════════
// Chrome Extension 消息类型 (Observer Pattern)
// ══════════════════════════════════════════════════════════

export type MessageAction =
  | 'EXTRACT_RESUMES'
  | 'EXTRACT_CURRENT_RESUME'
  | 'SCREEN_RESUME'
  | 'BATCH_SCREEN'
  | 'COMPARE_RESUMES'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'EXTRACTION_RESULT'
  | 'OPEN_SIDEPANEL';

export interface ExtensionMessage<T = unknown> {
  action: MessageAction;
  payload?: T;
}

export interface ExtractedResumesPayload {
  resumes: ResumeData[];
  platform: string;
  pageUrl: string;
}

/** Azure OpenAI 配置 */
export interface AiConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
}

/** 插件设置 */
export interface ExtensionSettings {
  aiConfig: AiConfig;
  defaultCriteria: Partial<ScreeningCriteria>;
  autoExtract: boolean;
  maxConcurrent: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  aiConfig: {
    endpoint: '',
    apiKey: '',
    deploymentName: 'gpt-5.2',
  },
  defaultCriteria: {},
  autoExtract: false,
  maxConcurrent: 3,
};

import type {
  AiConfig,
  ResumeData,
  ScreeningCriteria,
  ScreeningResult,
  RecommendationLevel,
  DimensionScore,
} from './types';

// ══════════════════════════════════════════════════════════
// Azure OpenAI 直调服务 - 无需后端，纯前端调用
// ══════════════════════════════════════════════════════════

const API_VERSION = '2024-12-01-preview';

/** 调用 Azure OpenAI Chat Completion */
async function chatCompletion(
  config: AiConfig,
  messages: { role: string; content: string }[],
  options: { temperature?: number; responseFormat?: 'json_object' | 'text' } = {}
): Promise<string> {
  const url = `${config.endpoint.replace(/\/+$/, '')}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${API_VERSION}`;

  const body: Record<string, unknown> = {
    messages,
    temperature: options.temperature ?? 0.3,
  };

  if (options.responseFormat === 'json_object') {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Azure OpenAI 调用失败 (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ── Prompt 构建 ──────────────────────────────────────────

function buildSystemPrompt(): string {
  return `你是一位资深的人力资源AI助手，专门帮助HR高效筛选简历。
你的任务是根据岗位要求对候选人简历进行专业评估。

评估维度：
1. 技能匹配度 - 候选人技能与岗位要求的契合程度
2. 经验相关性 - 工作经历与岗位的相关性
3. 教育背景 - 学历是否达标以及专业相关性
4. 综合素质 - 基于自我评价、项目经历等判断软实力

评分规则：
- 每个维度 0-100 分
- 综合评分为各维度加权平均
- 技能匹配度权重 35%，经验相关性权重 30%，教育背景权重 15%，综合素质权重 20%

推荐等级：
- 80 分以上：强烈推荐（StronglyRecommended）
- 60-79 分：推荐（Recommended）
- 40-59 分：待定（MaybeConsider）
- 40 分以下：不推荐（NotRecommended）

你必须严格按照指定的 JSON 格式输出，不要包含任何其他内容。`;
}

function formatSalary(min?: number, max?: number): string {
  if (min != null && max != null) return `${min}K - ${max}K`;
  if (min != null) return `${min}K 以上`;
  if (max != null) return `${max}K 以下`;
  return '面议';
}

function buildScreeningPrompt(resume: ResumeData, criteria: ScreeningCriteria): string {
  const skillsRequired = criteria.requiredSkills.length > 0
    ? criteria.requiredSkills.join('、') : '未指定';
  const skillsPreferred = criteria.preferredSkills.length > 0
    ? criteria.preferredSkills.join('、') : '无';
  const candidateSkills = resume.skills.length > 0
    ? resume.skills.join('、') : '未提取到';

  return `## 岗位要求

- 岗位名称：${criteria.jobTitle}
- 岗位描述：${criteria.jobDescription}
- 必须技能：${skillsRequired}
- 加分技能：${skillsPreferred}
- 最低工作年限：${criteria.minExperienceYears ?? '不限'}年
- 最低学历：${criteria.minEducation ?? '不限'}
- 薪资范围：${formatSalary(criteria.minSalaryK, criteria.maxSalaryK)}
- 偏好城市：${criteria.preferredLocations.length > 0 ? criteria.preferredLocations.join('、') : '不限'}
- 附加要求：${criteria.additionalRequirements || '无'}

## 候选人简历

- 姓名：${resume.name}
- 当前职位：${resume.currentTitle}
- 工作年限：${resume.workExperience}
- 学历：${resume.education}
- 期望薪资：${resume.expectedSalary}
- 年龄：${resume.age}
- 所在城市：${resume.location}
- 技能标签：${candidateSkills}
- 来源平台：${resume.platform}

### 工作经历
${resume.workHistory}

### 教育经历
${resume.educationHistory}

### 项目经验
${resume.projectExperience}

### 自我评价
${resume.selfDescription}

${resume.rawText ? `### 原始简历文本\n${resume.rawText}` : ''}

## 输出格式

请严格按以下 JSON 格式输出：
\`\`\`json
{
  "candidateName": "姓名",
  "overallScore": 75,
  "recommendation": "Recommended",
  "dimensionScores": [
    { "dimension": "技能匹配度", "score": 80, "comment": "评语" },
    { "dimension": "经验相关性", "score": 70, "comment": "评语" },
    { "dimension": "教育背景", "score": 75, "comment": "评语" },
    { "dimension": "综合素质", "score": 72, "comment": "评语" }
  ],
  "strengths": ["亮点1", "亮点2"],
  "concerns": ["不足1", "不足2"],
  "summary": "一段话总结该候选人与岗位的匹配情况",
  "suggestedQuestions": ["面试问题1", "面试问题2", "面试问题3"]
}
\`\`\``;
}

function buildComparisonPrompt(resumes: ResumeData[], criteria: ScreeningCriteria): string {
  const resumeSummaries = resumes
    .map(
      (r, i) => `### 候选人 ${i + 1}：${r.name}
- 当前职位：${r.currentTitle}
- 工作年限：${r.workExperience}
- 学历：${r.education}
- 技能：${r.skills.length > 0 ? r.skills.join('、') : '未提取'}
- 工作经历：${r.workHistory}
- 项目经验：${r.projectExperience}`
    )
    .join('\n\n---\n\n');

  const requiredSkills = criteria.requiredSkills.length > 0
    ? criteria.requiredSkills.join('、') : '未指定';

  return `## 岗位要求

- 岗位名称：${criteria.jobTitle}
- 岗位描述：${criteria.jobDescription}
- 必须技能：${requiredSkills}

## 候选人列表

${resumeSummaries}

## 任务

请对以上 ${resumes.length} 位候选人进行横向对比分析：
1. 按匹配度从高到低排序
2. 说明每位候选人的核心优劣势
3. 给出最终推荐排名和理由
4. 使用 Markdown 表格呈现对比结果

请直接输出 Markdown 格式的分析报告。`;
}

// ── 结果解析 ─────────────────────────────────────────────

function parseRecommendation(value: string, score: number): RecommendationLevel {
  switch (value.toLowerCase()) {
    case 'stronglyrecommended': return 'StronglyRecommended';
    case 'recommended': return 'Recommended';
    case 'maybeconsider': return 'MaybeConsider';
    case 'notrecommended': return 'NotRecommended';
    default:
      if (score >= 80) return 'StronglyRecommended';
      if (score >= 60) return 'Recommended';
      if (score >= 40) return 'MaybeConsider';
      return 'NotRecommended';
  }
}

function parseScreeningResult(json: string, fallbackName: string): ScreeningResult {
  try {
    // 移除可能的 markdown 代码块标记
    let cleaned = json.trim();
    if (cleaned.startsWith('```')) {
      const firstNewline = cleaned.indexOf('\n');
      cleaned = cleaned.substring(firstNewline + 1);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'));
    }
    cleaned = cleaned.trim();

    const root = JSON.parse(cleaned);

    const dimensionScores: DimensionScore[] = (root.dimensionScores ?? []).map(
      (d: { dimension?: string; score?: number; comment?: string }) => ({
        dimension: d.dimension ?? '',
        score: d.score ?? 0,
        comment: d.comment ?? '',
      })
    );

    const overallScore = root.overallScore ?? 0;
    const recommendation = parseRecommendation(
      root.recommendation ?? '',
      overallScore
    );

    return {
      candidateName: root.candidateName ?? fallbackName,
      overallScore,
      recommendation,
      dimensionScores,
      strengths: (root.strengths ?? []).filter((s: string) => s),
      concerns: (root.concerns ?? []).filter((s: string) => s),
      summary: root.summary ?? '',
      suggestedQuestions: (root.suggestedQuestions ?? []).filter((s: string) => s),
    };
  } catch {
    return {
      candidateName: fallbackName,
      overallScore: 0,
      recommendation: 'NotRecommended',
      dimensionScores: [],
      strengths: [],
      concerns: [],
      summary: `AI 响应解析失败`,
      suggestedQuestions: [],
    };
  }
}

// ══════════════════════════════════════════════════════════
// 公开 API
// ══════════════════════════════════════════════════════════

/** 筛选单份简历 */
export async function screenResume(
  config: AiConfig,
  resume: ResumeData,
  criteria: ScreeningCriteria
): Promise<ScreeningResult> {
  const content = await chatCompletion(
    config,
    [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildScreeningPrompt(resume, criteria) },
    ],
    { temperature: 0.3, responseFormat: 'json_object' }
  );
  return parseScreeningResult(content, resume.name);
}

/** 批量筛选（带并发控制） */
export async function batchScreen(
  config: AiConfig,
  resumes: ResumeData[],
  criteria: ScreeningCriteria,
  maxConcurrent = 3
): Promise<ScreeningResult[]> {
  const results: ScreeningResult[] = [];
  // 简易信号量并发控制
  for (let i = 0; i < resumes.length; i += maxConcurrent) {
    const batch = resumes.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map((r) => screenResume(config, r, criteria))
    );
    results.push(...batchResults);
  }
  // 按综合评分降序
  results.sort((a, b) => b.overallScore - a.overallScore);
  return results;
}

/** 对比分析多份简历 */
export async function compareResumes(
  config: AiConfig,
  resumes: ResumeData[],
  criteria: ScreeningCriteria
): Promise<string> {
  return chatCompletion(
    config,
    [
      {
        role: 'system',
        content: '你是一位资深HR顾问，擅长候选人对比分析。请用专业、客观的语言进行分析。',
      },
      { role: 'user', content: buildComparisonPrompt(resumes, criteria) },
    ],
    { temperature: 0.4 }
  );
}

/** 测试 Azure OpenAI 连接 */
export async function testConnection(config: AiConfig): Promise<boolean> {
  try {
    const content = await chatCompletion(
      config,
      [{ role: 'user', content: '请回复 ok' }],
      { temperature: 0 }
    );
    return content.length > 0;
  } catch {
    return false;
  }
}

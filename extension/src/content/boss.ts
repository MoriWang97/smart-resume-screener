// ── 类型定义（内联，避免跨文件 import 导致 content script 模块错误）──
interface ResumeData {
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

interface ExtensionMessage {
  action: string;
  payload?: unknown;
}

interface ResumeExtractor {
  readonly platform: string;
  isResumePage(): boolean;
  isListPage(): boolean;
  extractCurrentResume(): ResumeData | null;
  extractResumeList(): ResumeData[];
}

// ── 工具函数（内联） ──
function getText(selector: string, parent: Element | Document = document): string {
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() ?? '';
}

function getTexts(selector: string, parent: Element | Document = document): string[] {
  return Array.from(parent.querySelectorAll(selector))
    .map((el) => el.textContent?.trim() ?? '')
    .filter(Boolean);
}

function createEmptyResume(platform: string): ResumeData {
  return {
    name: '',
    currentTitle: '',
    workExperience: '',
    education: '',
    expectedSalary: '',
    age: '',
    location: '',
    skills: [],
    workHistory: '',
    educationHistory: '',
    projectExperience: '',
    selfDescription: '',
    platform,
    profileUrl: window.location.href,
    rawText: '',
  };
}

/**
 * Boss直聘 简历提取策略
 * 针对 www.zhipin.com 的 DOM 结构进行数据抽取
 */
class BossExtractor implements ResumeExtractor {
  readonly platform = 'Boss直聘';

  isResumePage(): boolean {
    // Boss直聘候选人详情页 URL 通常包含 /resume/ 或 geek 相关路径
    const url = window.location.href;
    return (
      url.includes('/resume/') ||
      url.includes('/geek/') ||
      document.querySelector('.resume-detail, .geek-detail, .resume-content') !== null
    );
  }

  isListPage(): boolean {
    const url = window.location.href;
    return (
      url.includes('/web/boss/recommend') ||
      url.includes('/web/boss/search') ||
      document.querySelector('.candidate-list, .resume-list') !== null
    );
  }

  extractCurrentResume(): ResumeData | null {
    try {
      const resume = createEmptyResume(this.platform);

      // 基本信息 - Boss直聘候选人详情页
      const name =
        getText('.name, .geek-name, .resume-name, [class*="name"]') ||
        getText('h1');

      const title =
        getText('.expect-position, .geek-expect, [class*="expect"], [class*="title"]') ||
        getText('.job-title');

      // 工作经验和学历通常在 tag 列表中
      const infoTags = getTexts(
        '.info-labels span, .geek-tags span, .resume-info span, [class*="info"] span'
      );

      let experience = '';
      let education = '';
      let age = '';
      let salary = '';
      let location = '';

      for (const tag of infoTags) {
        if (/\d+年|应届|在校/.test(tag)) experience = tag;
        else if (/本科|硕士|博士|大专|高中|MBA/.test(tag)) education = tag;
        else if (/\d+岁/.test(tag)) age = tag;
        else if (/K|k|薪|工资|万/.test(tag)) salary = tag;
        else if (/市|省|区|北京|上海|广州|深圳|杭州/.test(tag)) location = tag;
      }

      // 技能标签
      const skills = getTexts(
        '.skill-labels span, .skill-tag, [class*="skill"] span, [class*="tag"] span'
      );

      // 工作经历
      const workSections = document.querySelectorAll(
        '.resume-work, .work-exp, [class*="work-experience"], [class*="work-exp"]'
      );
      const workHistory = Array.from(workSections)
        .map((s) => s.textContent?.trim())
        .filter(Boolean)
        .join('\n\n');

      // 教育经历
      const eduSections = document.querySelectorAll(
        '.resume-education, .edu-exp, [class*="education"], [class*="edu-exp"]'
      );
      const educationHistory = Array.from(eduSections)
        .map((s) => s.textContent?.trim())
        .filter(Boolean)
        .join('\n\n');

      // 项目经验
      const projectSections = document.querySelectorAll(
        '.resume-project, .project-exp, [class*="project"]'
      );
      const projectExperience = Array.from(projectSections)
        .map((s) => s.textContent?.trim())
        .filter(Boolean)
        .join('\n\n');

      // 自我评价
      const selfDesc =
        getText('.resume-self, .self-evaluation, [class*="self-evaluation"], [class*="description"]');

      // 整页原始文本作为兜底
      const mainContent = document.querySelector(
        '.resume-detail, .geek-detail, .resume-content, main, #main'
      );
      const rawText = mainContent?.textContent?.trim() ?? document.body.innerText.substring(0, 5000);

      return {
        ...resume,
        name,
        currentTitle: title,
        workExperience: experience,
        education,
        expectedSalary: salary,
        age,
        location,
        skills: [...new Set(skills)],
        workHistory,
        educationHistory,
        projectExperience,
        selfDescription: selfDesc,
        rawText,
      };
    } catch (err) {
      console.error('[SmartResumeScreener] Boss直聘提取失败:', err);
      return null;
    }
  }

  extractResumeList(): ResumeData[] {
    const resumes: ResumeData[] = [];
    try {
      // 候选人列表卡片
      const cards = document.querySelectorAll(
        '.candidate-card, .resume-card, [class*="candidate-item"], [class*="card-inner"]'
      );

      cards.forEach((card) => {
        const resume = createEmptyResume(this.platform);
        const name = getText('.name, [class*="name"]', card);
        const title = getText('.expect, .title, [class*="expect"], [class*="title"]', card);
        const tags = getTexts('span, [class*="tag"]', card);

        let experience = '';
        let education = '';
        let age = '';
        let location = '';

        for (const tag of tags) {
          if (/\d+年|应届/.test(tag)) experience = tag;
          else if (/本科|硕士|博士|大专/.test(tag)) education = tag;
          else if (/\d+岁/.test(tag)) age = tag;
          else if (/市|北京|上海|广州|深圳|杭州/.test(tag)) location = tag;
        }

        const linkEl = card.querySelector('a[href]');
        const profileUrl = linkEl
          ? new URL(linkEl.getAttribute('href') ?? '', window.location.origin).href
          : '';

        resumes.push({
          ...resume,
          name,
          currentTitle: title,
          workExperience: experience,
          education,
          age,
          location,
          profileUrl,
          rawText: card.textContent?.trim() ?? '',
        });
      });
    } catch (err) {
      console.error('[SmartResumeScreener] Boss直聘列表提取失败:', err);
    }
    return resumes;
  }
}

// ── 内容脚本入口 ─────────────────────────────────────────
const extractor = new BossExtractor();

// 监听来自 background / sidepanel 的消息
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.action === 'EXTRACT_CURRENT_RESUME') {
      const resume = extractor.extractCurrentResume();
      sendResponse({ success: !!resume, data: resume });
      return true;
    }

    if (message.action === 'EXTRACT_RESUMES') {
      let resumes: ResumeData[];
      if (extractor.isResumePage()) {
        const single = extractor.extractCurrentResume();
        resumes = single ? [single] : [];
      } else if (extractor.isListPage()) {
        resumes = extractor.extractResumeList();
      } else {
        // 尝试提取整页文本作为兜底
        const fallback = createEmptyResume(extractor.platform);
        fallback.rawText = document.body.innerText.substring(0, 8000);
        resumes = [fallback];
      }

      sendResponse({
        success: true,
        data: {
          resumes,
          platform: extractor.platform,
          pageUrl: window.location.href,
        },
      });
      return true;
    }

    return false;
  }
);

console.log('[SmartResumeScreener] Boss直聘内容脚本已加载');

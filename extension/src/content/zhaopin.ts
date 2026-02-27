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
 * 智联招聘 简历提取策略
 * 针对 sou.zhaopin.com / rd.zhaopin.com / i.zhaopin.com 的 DOM 结构
 */
class ZhaopinExtractor implements ResumeExtractor {
  readonly platform = '智联招聘';

  isResumePage(): boolean {
    const url = window.location.href;
    return (
      url.includes('/resume/') ||
      url.includes('/rd.zhaopin.com') ||
      document.querySelector('.resume-detail, .resume__detail, [class*="resume-detail"]') !== null
    );
  }

  isListPage(): boolean {
    const url = window.location.href;
    return (
      url.includes('sou.zhaopin.com') ||
      url.includes('/search/') ||
      document.querySelector('.resume-list, .search-result, [class*="resume-list"]') !== null
    );
  }

  extractCurrentResume(): ResumeData | null {
    try {
      const resume = createEmptyResume(this.platform);

      // 姓名
      const name =
        getText('.resume__name, .name, [class*="resume-name"], [class*="userName"]') ||
        getText('h1, h2');

      // 期望职位
      const title =
        getText('.resume__expect, .expect-job, [class*="expect-position"], [class*="target-job"]');

      // 基本信息区域 - 智联通常有结构化的 info 区
      const infoTexts = getTexts(
        '.resume__basic span, .basic-info span, [class*="info-item"], [class*="basic"] li'
      );

      let experience = '';
      let education = '';
      let age = '';
      let salary = '';
      let location = '';

      for (const text of infoTexts) {
        if (/\d+年|应届|经验/.test(text)) experience = text;
        else if (/本科|硕士|博士|大专|高中|MBA|统招/.test(text)) education = text;
        else if (/\d+岁|出生/.test(text)) age = text;
        else if (/K|k|薪|月薪|年薪|万/.test(text)) salary = text;
        else if (/市|省|北京|上海|广州|深圳|杭州|成都|武汉|南京/.test(text)) location = text;
      }

      // 技能标签
      const skills = getTexts(
        '.skill-tag, .resume__skill span, [class*="skill"] span, [class*="tag-item"]'
      );

      // 工作经历
      const workSections = document.querySelectorAll(
        '.resume__work, .work-experience, [class*="work-exp"], [class*="career"]'
      );
      const workHistory = Array.from(workSections)
        .map((s) => s.textContent?.trim())
        .filter(Boolean)
        .join('\n\n');

      // 教育经历
      const eduSections = document.querySelectorAll(
        '.resume__education, .education-experience, [class*="education"], [class*="edu"]'
      );
      const educationHistory = Array.from(eduSections)
        .map((s) => s.textContent?.trim())
        .filter(Boolean)
        .join('\n\n');

      // 项目经验
      const projectSections = document.querySelectorAll(
        '.resume__project, .project-experience, [class*="project"]'
      );
      const projectExperience = Array.from(projectSections)
        .map((s) => s.textContent?.trim())
        .filter(Boolean)
        .join('\n\n');

      // 自我评价
      const selfDesc =
        getText('.resume__self, .self-evaluation, [class*="self-evaluation"], [class*="self-desc"]') ||
        getText('[class*="advantage"], [class*="evaluation"]');

      // 整页兜底
      const mainContent = document.querySelector(
        '.resume-detail, .resume__detail, main, #app'
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
      console.error('[SmartResumeScreener] 智联招聘提取失败:', err);
      return null;
    }
  }

  extractResumeList(): ResumeData[] {
    const resumes: ResumeData[] = [];
    try {
      const cards = document.querySelectorAll(
        '.resume-card, .resume-item, [class*="resume-card"], [class*="search-result-item"]'
      );

      cards.forEach((card) => {
        const resume = createEmptyResume(this.platform);
        const name = getText('.name, [class*="name"]', card);
        const title = getText('.expect, .title, [class*="expect"], [class*="title"]', card);
        const tags = getTexts('span, [class*="info"]', card);

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
      console.error('[SmartResumeScreener] 智联招聘列表提取失败:', err);
    }
    return resumes;
  }
}

// ── 内容脚本入口 ─────────────────────────────────────────
const extractor = new ZhaopinExtractor();

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

console.log('[SmartResumeScreener] 智联招聘内容脚本已加载');

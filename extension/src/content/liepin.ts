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
 * 猎聘 简历提取策略
 * 针对 liepin.com 的 DOM 结构进行数据抽取
 */
class LiepinExtractor implements ResumeExtractor {
  readonly platform = '猎聘';

  isResumePage(): boolean {
    const url = window.location.href;
    return (
      url.includes('/resume/') ||
      url.includes('/cv/') ||
      document.querySelector('.resume-detail, [class*="resume-detail"], [class*="cv-detail"]') !== null
    );
  }

  isListPage(): boolean {
    const url = window.location.href;
    return (
      url.includes('/recommend') ||
      url.includes('/search') ||
      url.includes('/talent') ||
      document.querySelector('[class*="candidate-list"], [class*="resume-list"], [class*="talent-list"]') !== null
    );
  }

  extractCurrentResume(): ResumeData | null {
    try {
      const resume = createEmptyResume(this.platform);

      // 姓名 - 猎聘候选人详情页
      const name =
        getText('[class*="name"], .candidate-name, .resume-name') ||
        getText('h1, h2');

      // 期望职位 / 当前职位
      const title =
        getText('[class*="expect"], [class*="position"], [class*="title"]') ||
        getText('.job-title');

      // 基本信息（年龄、经验、学历、薪资、城市）
      // 猎聘通常在候选人卡片中以 span 列表展示
      const infoTags = getTexts(
        '[class*="info"] span, [class*="basic"] span, [class*="tag"] span, [class*="detail"] span'
      );

      let experience = '';
      let education = '';
      let age = '';
      let salary = '';
      let location = '';

      for (const tag of infoTags) {
        if (/\d+年|应届|在校|经验/.test(tag)) experience = tag;
        else if (/本科|硕士|博士|大专|高中|MBA|统招/.test(tag)) education = tag;
        else if (/\d+岁/.test(tag)) age = tag;
        else if (/K|k|薪|工资|万|月薪|年薪/.test(tag)) salary = tag;
        else if (/市|省|区|北京|上海|广州|深圳|杭州|苏州|成都|武汉|南京/.test(tag)) location = tag;
      }

      // 技能标签
      const skills = getTexts(
        '[class*="skill"] span, [class*="tag-item"], [class*="label"] span'
      );

      // 工作经历
      const workSections = document.querySelectorAll(
        '[class*="work-exp"], [class*="work-experience"], [class*="career"], [class*="experience-item"]'
      );
      const workHistory = Array.from(workSections)
        .map((s) => s.textContent?.trim())
        .filter(Boolean)
        .join('\n\n');

      // 教育经历
      const eduSections = document.querySelectorAll(
        '[class*="edu"], [class*="education"], [class*="school"]'
      );
      const educationHistory = Array.from(eduSections)
        .map((s) => s.textContent?.trim())
        .filter(Boolean)
        .join('\n\n');

      // 项目经验
      const projectSections = document.querySelectorAll(
        '[class*="project"]'
      );
      const projectExperience = Array.from(projectSections)
        .map((s) => s.textContent?.trim())
        .filter(Boolean)
        .join('\n\n');

      // 自我评价
      const selfDesc =
        getText('[class*="self-evaluation"], [class*="self-desc"], [class*="advantage"], [class*="evaluation"], [class*="description"]');

      // 整页原始文本作为兜底
      const mainContent = document.querySelector(
        '[class*="resume-detail"], [class*="cv-detail"], main, #main, #app'
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
      console.error('[SmartResumeScreener] 猎聘提取失败:', err);
      return null;
    }
  }

  extractResumeList(): ResumeData[] {
    const resumes: ResumeData[] = [];
    try {
      // 猎聘候选人列表 - 从截图看每个候选人是一个独立区块
      const cards = document.querySelectorAll(
        '[class*="candidate-card"], [class*="resume-card"], [class*="talent-card"], [class*="candidate-item"], [class*="resume-item"]'
      );

      // 如果上面的选择器没匹配到，尝试更通用的选择器
      const candidateElements = cards.length > 0
        ? cards
        : document.querySelectorAll('.list-item, [class*="list-item"], [class*="card-inner"]');

      candidateElements.forEach((card) => {
        const resume = createEmptyResume(this.platform);
        const name = getText('[class*="name"], a[class*="name"]', card);
        if (!name) return; // 跳过没有名字的卡片

        const title = getText('[class*="expect"], [class*="position"], [class*="title"]', card);
        const tags = getTexts('span', card);

        let experience = '';
        let education = '';
        let age = '';
        let salary = '';
        let location = '';

        for (const tag of tags) {
          if (/\d+年|应届/.test(tag)) experience = tag;
          else if (/本科|硕士|博士|大专/.test(tag)) education = tag;
          else if (/\d+岁/.test(tag)) age = tag;
          else if (/K|k|万|薪/.test(tag)) salary = tag;
          else if (/市|北京|上海|广州|深圳|杭州|苏州/.test(tag)) location = tag;
        }

        // 技能标签
        const skills = getTexts('[class*="skill"] span, [class*="tag"]', card);

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
          expectedSalary: salary,
          age,
          location,
          skills: [...new Set(skills)],
          profileUrl,
          rawText: card.textContent?.trim() ?? '',
        });
      });
    } catch (err) {
      console.error('[SmartResumeScreener] 猎聘列表提取失败:', err);
    }
    return resumes;
  }
}

// ── 内容脚本入口 ─────────────────────────────────────────
const extractor = new LiepinExtractor();

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

console.log('[SmartResumeScreener] 猎聘内容脚本已加载');

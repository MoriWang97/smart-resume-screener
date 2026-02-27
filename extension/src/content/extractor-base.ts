import type { ResumeData } from '../shared/types';

/**
 * Strategy Pattern - 简历提取器接口
 * 每个招聘平台实现各自的提取逻辑
 */
export interface ResumeExtractor {
  /** 平台标识 */
  readonly platform: string;

  /** 检查当前页面是否为该平台的简历页 */
  isResumePage(): boolean;

  /** 检查当前页面是否为候选人列表页 */
  isListPage(): boolean;

  /** 从简历详情页提取单份简历 */
  extractCurrentResume(): ResumeData | null;

  /** 从列表页提取所有候选人简历摘要 */
  extractResumeList(): ResumeData[];
}

/** 工具函数 - 安全获取元素文本 */
export function getText(selector: string, parent: Element | Document = document): string {
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() ?? '';
}

/** 工具函数 - 获取多个元素文本数组 */
export function getTexts(selector: string, parent: Element | Document = document): string[] {
  return Array.from(parent.querySelectorAll(selector))
    .map((el) => el.textContent?.trim() ?? '')
    .filter(Boolean);
}

/** 工具函数 - 安全获取属性值 */
export function getAttr(
  selector: string,
  attr: string,
  parent: Element | Document = document
): string {
  const el = parent.querySelector(selector);
  return el?.getAttribute(attr)?.trim() ?? '';
}

/** 创建空白简历模板 */
export function createEmptyResume(platform: string): ResumeData {
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

import type { ExtensionSettings } from './types';

const SETTINGS_KEY = 'srs_settings';
const CRITERIA_KEY = 'srs_criteria';
const RESULTS_KEY = 'srs_results';

/**
 * Chrome Storage 工具类
 * 封装 chrome.storage.local 的读写操作
 */
export const storage = {
  /** 获取插件设置（自动兼容旧格式） */
  async getSettings(): Promise<ExtensionSettings> {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    const raw = data[SETTINGS_KEY];
    const defaults: ExtensionSettings = {
      aiConfig: {
        endpoint: '',
        apiKey: '',
        deploymentName: 'gpt-5.2',
      },
      defaultCriteria: {},
      autoExtract: false,
      maxConcurrent: 3,
    };
    if (!raw) return defaults;
    // 兼容旧版：如果存储的是旧格式（有 apiBaseUrl 没有 aiConfig），则迁移
    if (!raw.aiConfig) {
      const migrated: ExtensionSettings = {
        ...defaults,
        autoExtract: raw.autoExtract ?? false,
        maxConcurrent: raw.maxConcurrent ?? 3,
        defaultCriteria: raw.defaultCriteria ?? {},
      };
      await chrome.storage.local.set({ [SETTINGS_KEY]: migrated });
      return migrated;
    }
    return { ...defaults, ...raw, aiConfig: { ...defaults.aiConfig, ...raw.aiConfig } };
  },

  /** 保存插件设置 */
  async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await this.getSettings();
    await chrome.storage.local.set({
      [SETTINGS_KEY]: { ...current, ...settings },
    });
  },

  /** 获取保存的筛选条件 */
  async getCriteria(): Promise<Record<string, unknown> | null> {
    const data = await chrome.storage.local.get(CRITERIA_KEY);
    return data[CRITERIA_KEY] ?? null;
  },

  /** 保存筛选条件 */
  async saveCriteria(criteria: Record<string, unknown>): Promise<void> {
    await chrome.storage.local.set({ [CRITERIA_KEY]: criteria });
  },

  /** 获取缓存的筛选结果 */
  async getResults(): Promise<unknown[]> {
    const data = await chrome.storage.local.get(RESULTS_KEY);
    return data[RESULTS_KEY] ?? [];
  },

  /** 保存筛选结果 */
  async saveResults(results: unknown[]): Promise<void> {
    await chrome.storage.local.set({ [RESULTS_KEY]: results });
  },

  /** 清除所有数据 */
  async clearAll(): Promise<void> {
    await chrome.storage.local.remove([SETTINGS_KEY, CRITERIA_KEY, RESULTS_KEY]);
  },
};

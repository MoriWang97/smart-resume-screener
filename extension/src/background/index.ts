import { screenResume, batchScreen, compareResumes } from '../shared/ai-service';
import { storage } from '../shared/storage';
import type {
  ExtensionMessage,
  ScreeningCriteria,
  ResumeData,
  ScreeningResult,
  AiConfig,
} from '../shared/types';

/**
 * Background Service Worker
 * 充当 Observer 中枢 - 协调 content script、sidepanel 和 AI 服务之间的通信
 * 纯前端架构：直接调用 Azure OpenAI，无需后端
 */

async function getAiConfig(): Promise<AiConfig> {
  const settings = await storage.getSettings();
  return settings.aiConfig;
}

// ── 消息监听 (Observer Pattern) ──────────────────────────
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    handleMessage(message, sender)
      .then(sendResponse)
      .catch((err) => {
        console.error('[SmartResumeScreener] 消息处理错误:', err);
        sendResponse({ success: false, error: String(err) });
      });
    return true; // 保持消息通道打开以支持异步
  }
);

async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.action) {
    case 'SCREEN_RESUME':
      return handleScreenResume(message.payload as {
        resume: ResumeData;
        criteria: ScreeningCriteria;
      });

    case 'BATCH_SCREEN':
      return handleBatchScreen(message.payload as {
        resumes: ResumeData[];
        criteria: ScreeningCriteria;
      });

    case 'COMPARE_RESUMES':
      return handleCompare(message.payload as {
        resumes: ResumeData[];
        criteria: ScreeningCriteria;
      });

    case 'GET_SETTINGS':
      return { success: true, data: await storage.getSettings() };

    case 'SAVE_SETTINGS': {
      const settings = message.payload as Record<string, unknown>;
      await storage.saveSettings(settings as any);
      return { success: true };
    }

    case 'OPEN_SIDEPANEL': {
      let tabId = sender.tab?.id;
      if (!tabId) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = activeTab?.id;
      }
      if (tabId) {
        await chrome.sidePanel.open({ tabId });
      }
      return { success: true };
    }

    default:
      return { success: false, error: `未知的 action: ${message.action}` };
  }
}

async function handleScreenResume(payload: {
  resume: ResumeData;
  criteria: ScreeningCriteria;
}): Promise<{ success: boolean; data?: ScreeningResult; error?: string }> {
  try {
    const config = await getAiConfig();
    if (!config.endpoint || !config.apiKey) {
      return { success: false, error: '请先在设置中配置 Azure OpenAI 的 Endpoint 和 API Key' };
    }
    const result = await screenResume(config, payload.resume, payload.criteria);
    // 缓存结果
    const cached = (await storage.getResults()) as ScreeningResult[];
    cached.unshift(result);
    await storage.saveResults(cached.slice(0, 100));
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '筛选失败' };
  }
}

async function handleBatchScreen(payload: {
  resumes: ResumeData[];
  criteria: ScreeningCriteria;
}): Promise<{ success: boolean; data?: ScreeningResult[]; error?: string }> {
  try {
    const config = await getAiConfig();
    if (!config.endpoint || !config.apiKey) {
      return { success: false, error: '请先在设置中配置 Azure OpenAI 的 Endpoint 和 API Key' };
    }
    const settings = await storage.getSettings();
    const results = await batchScreen(config, payload.resumes, payload.criteria, settings.maxConcurrent);
    await storage.saveResults(results);
    return { success: true, data: results };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '批量筛选失败' };
  }
}

async function handleCompare(payload: {
  resumes: ResumeData[];
  criteria: ScreeningCriteria;
}): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const config = await getAiConfig();
    if (!config.endpoint || !config.apiKey) {
      return { success: false, error: '请先在设置中配置 Azure OpenAI 的 Endpoint 和 API Key' };
    }
    const report = await compareResumes(config, payload.resumes, payload.criteria);
    return { success: true, data: report };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '对比分析失败' };
  }
}

// ── 扩展图标点击 → 打开 SidePanel ───────────────────────
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

// ── 安装/更新时初始化默认设置 ────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[SmartResumeScreener] 插件已安装，初始化默认设置');
    await storage.saveSettings({
      aiConfig: {
        endpoint: '',
        apiKey: '',
        deploymentName: 'gpt-5.2',
      },
      autoExtract: false,
      maxConcurrent: 3,
    });
  }
});

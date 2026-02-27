import React, { useState, useEffect } from 'react';
import type { ExtensionMessage } from '../shared/types';

export function Popup() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    // 获取当前标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? '';
      setCurrentUrl(url);
      setIsSupported(
        url.includes('zhipin.com') ||
        url.includes('zhaopin.com') ||
        url.includes('liepin.com')
      );
    });

    // 检查 AI 配置状态
    checkAiConfig();
  }, []);

  async function checkAiConfig() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GET_SETTINGS',
      } as ExtensionMessage);
      const config = response?.data?.aiConfig;
      setAiConfigured(!!(config?.endpoint && config?.apiKey));
    } catch {
      setAiConfigured(false);
    }
  }

  async function openSidePanel() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id });
      }
    } catch (err) {
      console.error('打开侧面板失败:', err);
    }
    window.close();
  }

  function getPlatformName(): string {
    if (currentUrl.includes('zhipin.com')) return 'Boss直聘';
    if (currentUrl.includes('zhaopin.com')) return '智联招聘';
    if (currentUrl.includes('liepin.com')) return '猎聘';
    return '未知平台';
  }

  return (
    <div className="w-80 bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-4">
        <h1 className="text-base font-bold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          AI简历筛选助手
        </h1>
        <p className="text-xs text-blue-200 mt-1">
          SmartResumeScreener v1.0.0
        </p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Platform Detection */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <div className={`w-3 h-3 rounded-full ${isSupported ? 'bg-green-400' : 'bg-slate-300'}`} />
          <div>
            <p className="text-sm font-medium text-slate-700">
              {isSupported ? getPlatformName() : '非招聘平台'}
            </p>
            <p className="text-xs text-slate-400">
              {isSupported ? '已识别，可以提取简历' : '请在 Boss直聘、智联招聘 或 猎聘 页面使用'}
            </p>
          </div>
        </div>

        {/* AI Config Status */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <div
            className={`w-3 h-3 rounded-full ${
              aiConfigured === true
                ? 'bg-green-400'
                : aiConfigured === false
                ? 'bg-amber-400'
                : 'bg-slate-300'
            }`}
          />
          <div>
            <p className="text-sm font-medium text-slate-700">AI 服务</p>
            <p className="text-xs text-slate-400">
              {aiConfigured === true && '已配置 Azure OpenAI'}
              {aiConfigured === false && '未配置 - 请在侧面板设置中填写'}
              {aiConfigured === null && '检测中...'}
            </p>
          </div>
        </div>

        {/* Open SidePanel */}
        <button
          onClick={openSidePanel}
          disabled={!isSupported}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          打开筛选面板
        </button>

        {/* Quick Tips */}
        <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-100">
          <p className="font-medium text-slate-500">使用指南：</p>
          <p>1. 在招聘平台打开简历页面</p>
          <p>2. 点击"打开筛选面板"</p>
          <p>3. 提取简历 → 设定条件 → AI 筛选</p>
        </div>
      </div>
    </div>
  );
}

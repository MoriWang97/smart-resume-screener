import React, { useState, useEffect } from 'react';
import type { ExtensionSettings } from '../../shared/types';
import { storage } from '../../shared/storage';
import { testConnection } from '../../shared/ai-service';

export function SettingsPanel() {
  const [settings, setSettings] = useState<ExtensionSettings>({
    aiConfig: { endpoint: '', apiKey: '', deploymentName: 'gpt-5.2' },
    defaultCriteria: {},
    autoExtract: false,
    maxConcurrent: 3,
  });
  const [saved, setSaved] = useState(false);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    storage.getSettings().then(setSettings);
  }, []);

  async function handleSave() {
    await chrome.runtime.sendMessage({
      action: 'SAVE_SETTINGS',
      payload: settings,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleHealthCheck() {
    setCheckingHealth(true);
    setHealthOk(null);
    try {
      const ok = await testConnection(settings.aiConfig);
      setHealthOk(ok);
    } catch {
      setHealthOk(false);
    } finally {
      setCheckingHealth(false);
    }
  }

  async function handleClearData() {
    if (confirm('确定要清除所有缓存数据吗？')) {
      await storage.clearAll();
      window.location.reload();
    }
  }

  const updateAiConfig = (field: string, value: string) => {
    setSettings((s) => ({
      ...s,
      aiConfig: { ...s.aiConfig, [field]: value },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Azure OpenAI 配置</h3>

        {/* Endpoint */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Endpoint
          </label>
          <input
            type="text"
            value={settings.aiConfig.endpoint}
            onChange={(e) => updateAiConfig('endpoint', e.target.value)}
            placeholder="https://xxx.openai.azure.com"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* API Key */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            API Key
          </label>
          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.aiConfig.apiKey}
              onChange={(e) => updateAiConfig('apiKey', e.target.value)}
              placeholder="输入 API Key"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm transition-colors"
            >
              {showApiKey ? '隐藏' : '显示'}
            </button>
          </div>
        </div>

        {/* Deployment Name */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            模型部署名称
          </label>
          <input
            type="text"
            value={settings.aiConfig.deploymentName}
            onChange={(e) => updateAiConfig('deploymentName', e.target.value)}
            placeholder="gpt-5.2"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Test Connection */}
        <button
          onClick={handleHealthCheck}
          disabled={checkingHealth || !settings.aiConfig.endpoint || !settings.aiConfig.apiKey}
          className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          {checkingHealth ? '测试中...' : '测试连接'}
        </button>
        {healthOk !== null && (
          <p className={`text-xs ${healthOk ? 'text-green-600' : 'text-red-600'}`}>
            {healthOk ? '✓ Azure OpenAI 连接成功' : '✗ 连接失败，请检查 Endpoint 和 API Key'}
          </p>
        )}
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">通用设置</h3>

        {/* Auto Extract */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-slate-700">自动提取</label>
            <p className="text-xs text-slate-400">打开简历页时自动提取数据</p>
          </div>
          <button
            onClick={() =>
              setSettings((s) => ({ ...s, autoExtract: !s.autoExtract }))
            }
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.autoExtract ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings.autoExtract ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        {/* Max Concurrent */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            最大并发数
          </label>
          <select
            value={settings.maxConcurrent}
            onChange={(e) =>
              setSettings((s) => ({ ...s, maxConcurrent: Number(e.target.value) }))
            }
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value={1}>1</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {saved ? '✓ 已保存' : '保存设置'}
        </button>
        <button
          onClick={handleClearData}
          className="w-full py-2.5 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm"
        >
          清除缓存数据
        </button>
      </div>

      {/* About */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">关于</h3>
        <div className="text-xs text-slate-500 space-y-1">
          <p>SmartResumeScreener v1.0.0</p>
          <p>AI 简历智能筛选助手（纯前端版）</p>
          <p>支持平台：Boss直聘、智联招聘、猎聘</p>
          <p>AI：Azure OpenAI 直连</p>
        </div>
      </div>
    </div>
  );
}

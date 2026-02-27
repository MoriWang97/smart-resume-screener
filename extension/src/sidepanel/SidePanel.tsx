import React, { useState, useCallback } from 'react';
import type {
  ScreeningCriteria,
  ResumeData,
  ScreeningResult,
  ExtensionMessage,
  ExtractedResumesPayload,
} from '../shared/types';
import { CriteriaForm } from './components/CriteriaForm';
import { ResultCard } from './components/ResultCard';
import { ComparisonReport } from './components/ComparisonReport';
import { SettingsPanel } from './components/SettingsPanel';

type TabKey = 'screen' | 'results' | 'settings';

export function SidePanel() {
  const [activeTab, setActiveTab] = useState<TabKey>('screen');
  const [extractedResumes, setExtractedResumes] = useState<ResumeData[]>([]);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [comparisonReport, setComparisonReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');

  // 从当前页面提取简历
  const handleExtract = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setError('无法获取当前标签页');
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'EXTRACT_RESUMES',
      } as ExtensionMessage);

      if (response?.success && response.data) {
        const payload = response.data as ExtractedResumesPayload;
        setExtractedResumes(payload.resumes);
        setPlatform(payload.platform);
        setError('');
      } else {
        setError('未能提取到简历数据，请确认当前页面是否为招聘平台的简历页');
      }
    } catch (err) {
      setError(
        '提取失败。请确认：\n1. 当前页面是 Boss直聘 或 智联招聘\n2. 页面已完全加载'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // 发送筛选请求
  const handleScreen = useCallback(
    async (criteria: ScreeningCriteria) => {
      if (extractedResumes.length === 0) {
        setError('请先提取简历');
        return;
      }

      setError('');
      setLoading(true);
      try {
        const action = extractedResumes.length === 1 ? 'SCREEN_RESUME' : 'BATCH_SCREEN';
        const payload =
          extractedResumes.length === 1
            ? { resume: extractedResumes[0], criteria }
            : { resumes: extractedResumes, criteria };

        const response = await chrome.runtime.sendMessage({
          action,
          payload,
        } as ExtensionMessage);

        if (response?.success && response.data) {
          const data = Array.isArray(response.data) ? response.data : [response.data];
          setResults(data);
          setActiveTab('results');
        } else {
          setError(response?.error ?? 'AI 筛选失败');
        }
      } catch (err) {
        setError(`筛选请求失败: ${err instanceof Error ? err.message : '未知错误'}`);
      } finally {
        setLoading(false);
      }
    },
    [extractedResumes]
  );

  // 对比分析
  const handleCompare = useCallback(
    async (criteria: ScreeningCriteria) => {
      if (extractedResumes.length < 2) {
        setError('至少需要 2 份简历才能对比');
        return;
      }

      setError('');
      setLoading(true);
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'COMPARE_RESUMES',
          payload: { resumes: extractedResumes, criteria },
        } as ExtensionMessage);

        if (response?.success && response.data) {
          setComparisonReport(response.data);
          setActiveTab('results');
        } else {
          setError(response?.error ?? '对比分析失败');
        }
      } catch (err) {
        setError(`对比请求失败: ${err instanceof Error ? err.message : '未知错误'}`);
      } finally {
        setLoading(false);
      }
    },
    [extractedResumes]
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 shadow-lg">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          AI简历筛选助手
        </h1>
        {platform && (
          <span className="text-xs text-blue-200 mt-0.5 block">
            当前平台: {platform}
          </span>
        )}
      </header>

      {/* Tab Navigation */}
      <nav className="flex border-b border-slate-200 bg-white">
        {([
          ['screen', '筛选'],
          ['results', '结果'],
          ['settings', '设置'],
        ] as [TabKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {label}
            {key === 'results' && results.length > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">
                {results.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Error Alert */}
      {error && (
        <div className="mx-3 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd" />
            </svg>
            <span className="whitespace-pre-line">{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
          >
            关闭
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-3">
        {activeTab === 'screen' && (
          <div className="space-y-4">
            {/* Extract Section */}
            <section className="bg-white rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                第一步：提取简历
              </h2>
              <button
                onClick={handleExtract}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    提取中...
                  </span>
                ) : (
                  '从当前页面提取简历'
                )}
              </button>

              {extractedResumes.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm font-medium">
                    已提取 {extractedResumes.length} 份简历
                  </p>
                  <div className="mt-2 space-y-1">
                    {extractedResumes.slice(0, 10).map((r, i) => (
                      <div key={i} className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-4 h-4 bg-green-200 rounded-full flex items-center justify-center text-green-700 font-medium">
                          {i + 1}
                        </span>
                        {r.name || '未知姓名'} - {r.currentTitle || r.education || '无职位信息'}
                      </div>
                    ))}
                    {extractedResumes.length > 10 && (
                      <p className="text-xs text-green-500">
                        ...还有 {extractedResumes.length - 10} 份
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Criteria Form */}
            <section className="bg-white rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                第二步：设定筛选条件
              </h2>
              <CriteriaForm
                onScreen={handleScreen}
                onCompare={handleCompare}
                loading={loading}
                resumeCount={extractedResumes.length}
              />
            </section>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-4">
            {results.length > 0 && (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <StatCard
                    label="总计"
                    value={results.length}
                    color="blue"
                  />
                  <StatCard
                    label="推荐"
                    value={results.filter((r) =>
                      r.recommendation === 'StronglyRecommended' || r.recommendation === 'Recommended'
                    ).length}
                    color="green"
                  />
                  <StatCard
                    label="均分"
                    value={Math.round(
                      results.reduce((s, r) => s + r.overallScore, 0) / results.length
                    )}
                    color="indigo"
                  />
                </div>

                {/* Result Cards */}
                {results.map((result, index) => (
                  <ResultCard key={index} result={result} rank={index + 1} />
                ))}
              </>
            )}

            {comparisonReport && (
              <ComparisonReport report={comparisonReport} />
            )}

            {results.length === 0 && !comparisonReport && (
              <div className="text-center py-12 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">暂无筛选结果</p>
                <p className="text-xs mt-1">请先提取简历并执行筛选</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 mx-4 text-center">
            <svg className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-slate-700 font-medium">AI 正在分析简历...</p>
            <p className="text-xs text-slate-400 mt-1">请稍候，这可能需要几秒钟</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };
  return (
    <div className={`rounded-lg border p-3 text-center ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-75">{label}</div>
    </div>
  );
}

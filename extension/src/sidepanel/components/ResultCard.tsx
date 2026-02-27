import React, { useState } from 'react';
import type { ScreeningResult, RecommendationLevel } from '../../shared/types';

interface ResultCardProps {
  result: ScreeningResult;
  rank: number;
}

const LEVEL_CONFIG: Record<
  RecommendationLevel,
  { label: string; color: string; bgColor: string; emoji: string }
> = {
  StronglyRecommended: {
    label: '强烈推荐',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-300',
    emoji: '🌟',
  },
  Recommended: {
    label: '推荐',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-300',
    emoji: '✅',
  },
  MaybeConsider: {
    label: '待定',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100 border-amber-300',
    emoji: '🤔',
  },
  NotRecommended: {
    label: '不推荐',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-300',
    emoji: '❌',
  },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export function ResultCard({ result, rank }: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = LEVEL_CONFIG[result.recommendation] ?? LEVEL_CONFIG.NotRecommended;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
              {rank}
            </span>
            <h3 className="font-semibold text-slate-800">
              {result.candidateName || '未知候选人'}
            </h3>
          </div>
          <div className={`text-2xl font-bold ${getScoreColor(result.overallScore)}`}>
            {result.overallScore}
            <span className="text-xs font-normal text-slate-400 ml-0.5">分</span>
          </div>
        </div>

        {/* Recommendation Badge */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.color}`}>
            {config.emoji} {config.label}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
          {/* Summary */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              综合评价
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
          </div>

          {/* Dimension Scores */}
          {result.dimensionScores.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                维度评分
              </h4>
              <div className="space-y-2">
                {result.dimensionScores.map((dim, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600">{dim.dimension}</span>
                      <span className={`text-xs font-bold ${getScoreColor(dim.score)}`}>
                        {dim.score}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreBarColor(dim.score)}`}
                        style={{ width: `${dim.score}%` }}
                      />
                    </div>
                    {dim.comment && (
                      <p className="text-xs text-slate-500 mt-0.5">{dim.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {result.strengths.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">
                亮点
              </h4>
              <ul className="space-y-1">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns */}
          {result.concerns.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
                关注点
              </h4>
              <ul className="space-y-1">
                {result.concerns.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                    <span className="text-red-400 mt-0.5">!</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Questions */}
          {result.suggestedQuestions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
                建议面试问题
              </h4>
              <ol className="space-y-1 list-decimal list-inside">
                {result.suggestedQuestions.map((q, i) => (
                  <li key={i} className="text-sm text-slate-700">{q}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import type { ScreeningCriteria } from '../../shared/types';
import { storage } from '../../shared/storage';

interface CriteriaFormProps {
  onScreen: (criteria: ScreeningCriteria) => void;
  onCompare: (criteria: ScreeningCriteria) => void;
  loading: boolean;
  resumeCount: number;
}

const EMPTY_CRITERIA: ScreeningCriteria = {
  jobTitle: '',
  jobDescription: '',
  requiredSkills: [],
  preferredSkills: [],
  minExperienceYears: undefined,
  minEducation: undefined,
  maxSalaryK: undefined,
  minSalaryK: undefined,
  preferredLocations: [],
  additionalRequirements: '',
};

export function CriteriaForm({ onScreen, onCompare, loading, resumeCount }: CriteriaFormProps) {
  const [criteria, setCriteria] = useState<ScreeningCriteria>(EMPTY_CRITERIA);
  const [skillInput, setSkillInput] = useState('');
  const [preferredInput, setPreferredInput] = useState('');
  const [locationsInput, setLocationsInput] = useState('');

  // 加载上次保存的条件
  useEffect(() => {
    storage.getCriteria().then((saved) => {
      if (saved) {
        setCriteria(saved as unknown as ScreeningCriteria);
      }
    });
  }, []);

  function updateField<K extends keyof ScreeningCriteria>(
    key: K,
    value: ScreeningCriteria[K]
  ) {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(mode: 'screen' | 'compare') {
    // 解析逗号分隔的技能和城市
    const final: ScreeningCriteria = {
      ...criteria,
      requiredSkills: skillInput
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter(Boolean),
      preferredSkills: preferredInput
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter(Boolean),
      preferredLocations: locationsInput
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter(Boolean),
    };

    // 保存条件供下次使用
    storage.saveCriteria(final as any);

    if (mode === 'screen') {
      onScreen(final);
    } else {
      onCompare(final);
    }
  }

  return (
    <div className="space-y-3">
      {/* 岗位名称 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          岗位名称 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={criteria.jobTitle}
          onChange={(e) => updateField('jobTitle', e.target.value)}
          placeholder="例如：高级前端工程师"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* 岗位描述 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          岗位描述 / JD
        </label>
        <textarea
          value={criteria.jobDescription}
          onChange={(e) => updateField('jobDescription', e.target.value)}
          placeholder="粘贴岗位职责和要求..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
        />
      </div>

      {/* 必须技能 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          必须技能（逗号分隔）
        </label>
        <input
          type="text"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          placeholder="React, TypeScript, Node.js"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* 加分项 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          加分技能（逗号分隔）
        </label>
        <input
          type="text"
          value={preferredInput}
          onChange={(e) => setPreferredInput(e.target.value)}
          placeholder="GraphQL, AWS, Docker"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* 双列：经验 + 学历 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            最低工作年限
          </label>
          <select
            value={criteria.minExperienceYears ?? ''}
            onChange={(e) =>
              updateField(
                'minExperienceYears',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">不限</option>
            <option value="1">1年</option>
            <option value="3">3年</option>
            <option value="5">5年</option>
            <option value="8">8年</option>
            <option value="10">10年</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            最低学历
          </label>
          <select
            value={criteria.minEducation ?? ''}
            onChange={(e) =>
              updateField('minEducation', e.target.value || undefined)
            }
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">不限</option>
            <option value="大专">大专</option>
            <option value="本科">本科</option>
            <option value="硕士">硕士</option>
            <option value="博士">博士</option>
          </select>
        </div>
      </div>

      {/* 薪资范围 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            薪资下限 (K)
          </label>
          <input
            type="number"
            value={criteria.minSalaryK ?? ''}
            onChange={(e) =>
              updateField('minSalaryK', e.target.value ? Number(e.target.value) : undefined)
            }
            placeholder="例如: 15"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            薪资上限 (K)
          </label>
          <input
            type="number"
            value={criteria.maxSalaryK ?? ''}
            onChange={(e) =>
              updateField('maxSalaryK', e.target.value ? Number(e.target.value) : undefined)
            }
            placeholder="例如: 30"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* 偏好城市 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          偏好城市（逗号分隔）
        </label>
        <input
          type="text"
          value={locationsInput}
          onChange={(e) => setLocationsInput(e.target.value)}
          placeholder="北京, 上海, 杭州"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* 附加要求 */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          附加要求（自由描述）
        </label>
        <textarea
          value={criteria.additionalRequirements}
          onChange={(e) => updateField('additionalRequirements', e.target.value)}
          placeholder="例如：需要有大型项目经验，英语流利..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => handleSubmit('screen')}
          disabled={loading || !criteria.jobTitle || resumeCount === 0}
          className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {resumeCount <= 1 ? 'AI 筛选' : `批量筛选 (${resumeCount}份)`}
        </button>
        {resumeCount >= 2 && (
          <button
            onClick={() => handleSubmit('compare')}
            disabled={loading || !criteria.jobTitle}
            className="py-2.5 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            对比分析
          </button>
        )}
      </div>
    </div>
  );
}

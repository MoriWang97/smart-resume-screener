import React from 'react';

interface ComparisonReportProps {
  report: string;
}

export function ComparisonReport({ report }: ComparisonReportProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-indigo-700 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        候选人对比分析报告
      </h3>
      <div
        className="prose prose-sm max-w-none text-slate-700"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
      />
    </div>
  );
}

/** 简易 Markdown → HTML 渲染（支持表格、标题、列表、粗体等） */
function renderMarkdown(md: string): string {
  let html = md
    // 转义 HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 表格处理
  html = html.replace(
    /^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm,
    (_match, header: string, _divider: string, body: string) => {
      const headers = header.split('|').filter(Boolean).map((h: string) => h.trim());
      const rows = body.trim().split('\n').map((row: string) =>
        row.split('|').filter(Boolean).map((cell: string) => cell.trim())
      );

      let table = '<table class="w-full text-xs border-collapse border border-slate-300 my-2">';
      table += '<thead><tr>';
      headers.forEach((h: string) => {
        table += `<th class="border border-slate-300 px-2 py-1 bg-slate-100 text-left">${h}</th>`;
      });
      table += '</tr></thead><tbody>';
      rows.forEach((cells: string[]) => {
        table += '<tr>';
        cells.forEach((c: string) => {
          table += `<td class="border border-slate-300 px-2 py-1">${c}</td>`;
        });
        table += '</tr>';
      });
      table += '</tbody></table>';
      return table;
    }
  );

  // 标题
  html = html.replace(/^### (.+)$/gm, '<h4 class="font-semibold text-slate-800 mt-3 mb-1">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="font-bold text-slate-800 mt-4 mb-2 text-base">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="font-bold text-slate-900 mt-4 mb-2 text-lg">$1</h2>');

  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 列表
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>');

  // 换行
  html = html.replace(/\n\n/g, '<br/><br/>');

  return html;
}

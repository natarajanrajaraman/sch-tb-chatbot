'use client';

export function downloadCSV(data: string[][], title: string): void {
  const csvContent = data.map(row =>
    row.map(cell => {
      const escaped = (cell || '').replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')
        ? `"${escaped}"`
        : escaped;
    }).join(',')
  ).join('\n');
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `sch-tb-chatbot-${title.toLowerCase().replace(/\s+/g, '-')}-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataTable({ data, title }: { data: string[][]; title: string }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No {title.toLowerCase()} data available yet.
      </div>
    );
  }

  const headers = data[0] || [];
  const rows = data.slice(1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">{title} ({rows.length} records)</h2>
        <button
          onClick={() => downloadCSV(data, title)}
          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
        >
          Download CSV
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate" title={cell}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

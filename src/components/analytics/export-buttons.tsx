'use client';

import React from 'react';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';

interface Props {
  targetRef: React.RefObject<HTMLDivElement | null>;
  summary: Record<string, unknown>;
}

export default function ExportButtons({ targetRef, summary }: Props) {
  const handlePng = async () => {
    if (!targetRef.current) return;
    const url = await toPng(targetRef.current, { cacheBust: true });
    const link = document.createElement('a');
    link.download = 'analytics.png';
    link.href = url;
    link.click();
  };

  const handleExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([summary]);
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, 'analytics.xlsx');
  };

  const handlePrint = () => {
    window.print();
  };

  const btn =
    'rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors';

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btn} onClick={handlePng}>
        Export PNG
      </button>
      <button type="button" className={btn} onClick={handleExcel}>
        Export Excel
      </button>
      <button type="button" className={btn} onClick={handlePrint}>
        Print as PDF
      </button>
    </div>
  );
}

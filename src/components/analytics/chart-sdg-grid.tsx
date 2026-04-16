'use client';

interface Props {
  data: Array<{ name: string; value: number }>;
}

const SDG_COLORS: Record<number, string> = {
  1: '#E5243B',
  2: '#DDA63A',
  3: '#4C9F38',
  4: '#C5192D',
  5: '#FF3A21',
  6: '#26BDE2',
  7: '#FCC30B',
  8: '#A21942',
  9: '#FD6925',
  10: '#DD1367',
  11: '#FD9D24',
  12: '#BF8B2E',
  13: '#3F7E44',
  14: '#0A97D9',
  15: '#56C02B',
  16: '#00689D',
  17: '#19486A',
};

export default function ChartSdgGrid({ data }: Props) {
  const countMap = new Map(data.map((d) => [d.name, d.value]));

  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 17 }, (_, i) => i + 1).map((n) => {
        const count = countMap.get(String(n)) ?? 0;
        const bg = SDG_COLORS[n] ?? '#666';
        return (
          <div
            key={n}
            className="flex flex-col items-center justify-center rounded-md p-3 text-white"
            style={{ backgroundColor: bg }}
          >
            <span className="text-lg font-bold">{n}</span>
            <span className="text-xs opacity-90">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

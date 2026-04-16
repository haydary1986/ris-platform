'use client';

import { Treemap, ResponsiveContainer } from 'recharts';

interface Props {
  data: Array<{ name: string; value: number }>;
}

const COLORS = ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1'];

function CustomContent(props: Record<string, unknown>) {
  const { x, y, width, height, index, name, value } = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    index: number;
    name: string;
    value: number;
  };
  const cx = x + width / 2;
  const cy = y + height / 2;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={COLORS[index % COLORS.length]}
        stroke="#fff"
      />
      {width > 50 && height > 30 && (
        <>
          <text x={cx} y={cy - 7} textAnchor="middle" fill="#fff" fontSize={12}>
            {name}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="#fff" fontSize={11}>
            {value}
          </text>
        </>
      )}
    </g>
  );
}

export default function ChartByCollege({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <Treemap data={data} dataKey="value" content={<CustomContent />} />
    </ResponsiveContainer>
  );
}

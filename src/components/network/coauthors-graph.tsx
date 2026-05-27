'use client';

// Tiny force-directed graph rendered as inline SVG. Built from scratch
// (no D3 or vis-network) to avoid a ~150 KB dependency for a visualisation
// that only needs to handle a few hundred nodes.
//
// The simulation runs for a fixed number of iterations on mount, then
// stops — we don't need live animation, just a stable layout the user
// can pan around in. Click a node to navigate to its researcher page.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';

interface RawNode {
  id: string;
  username: string;
  name: string;
  college_id: string | null;
  h_index: number | null;
}

interface RawLink {
  source: string;
  target: string;
}

interface Node extends RawNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface CoauthorsGraphProps {
  nodes: RawNode[];
  links: RawLink[];
  width?: number;
  height?: number;
}

// Hash a string to a stable hue so each college lights up a consistent
// colour without us having to maintain a palette.
function hueFromId(id: string | null): number {
  if (!id) return 220;
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h % 360;
}

// Deterministic 0–1 from a string + salt — used instead of Math.random
// for initial node placement so the layout is stable across renders
// (React's purity lint forbids Math.random in render).
function pseudoRandom(id: string, salt: string): number {
  let h = 2166136261;
  const s = `${id}${salt}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// Simple, predictable force layout. Repulsive between every pair,
// spring along each edge, plus a soft pull toward the centre to keep
// the graph from drifting off-canvas. Tuned empirically for ~50-200
// nodes; bigger graphs need a quadtree (Barnes-Hut) which we can swap
// in later if needed.
function simulate(nodes: Node[], links: RawLink[], width: number, height: number): void {
  const REPULSION = 8000;
  const SPRING_K = 0.02;
  const SPRING_LEN = 90;
  const CENTRE_K = 0.005;
  const DAMPING = 0.85;
  const cx = width / 2;
  const cy = height / 2;

  const byId = new Map<string, Node>();
  for (const n of nodes) byId.set(n.id, n);

  for (let iter = 0; iter < 250; iter += 1) {
    // Repulsion (O(n²) — fine up to a few hundred nodes).
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy + 0.01;
        const force = REPULSION / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Spring forces along edges.
    for (const link of links) {
      const a = byId.get(link.source);
      const b = byId.get(link.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy + 0.01);
      const displacement = dist - SPRING_LEN;
      const fx = (dx / dist) * displacement * SPRING_K;
      const fy = (dy / dist) * displacement * SPRING_K;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Centre gravity + integrate.
    for (const n of nodes) {
      n.vx += (cx - n.x) * CENTRE_K;
      n.vy += (cy - n.y) * CENTRE_K;
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
      // Bound to canvas with a soft margin so labels stay visible.
      n.x = Math.max(20, Math.min(width - 20, n.x));
      n.y = Math.max(20, Math.min(height - 20, n.y));
    }
  }
}

export function CoauthorsGraph({
  nodes: rawNodes,
  links: rawLinks,
  width = 900,
  height = 600,
}: CoauthorsGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);

  // Deduplicate links + build degree map so high-collaboration nodes
  // render larger.
  const { nodes, links, degree } = useMemo(() => {
    const dedupLinks = new Map<string, RawLink>();
    for (const l of rawLinks) {
      const key = l.source < l.target ? `${l.source}::${l.target}` : `${l.target}::${l.source}`;
      if (!dedupLinks.has(key)) dedupLinks.set(key, l);
    }
    const linksOut = Array.from(dedupLinks.values());

    const deg = new Map<string, number>();
    for (const l of linksOut) {
      deg.set(l.source, (deg.get(l.source) ?? 0) + 1);
      deg.set(l.target, (deg.get(l.target) ?? 0) + 1);
    }

    const ns: Node[] = rawNodes.map((n) => ({
      ...n,
      x: width / 2 + (pseudoRandom(n.id, 'x') - 0.5) * width * 0.8,
      y: height / 2 + (pseudoRandom(n.id, 'y') - 0.5) * height * 0.8,
      vx: 0,
      vy: 0,
    }));
    simulate(ns, linksOut, width, height);
    return { nodes: ns, links: linksOut, degree: deg };
  }, [rawNodes, rawLinks, width, height]);

  // No-op effect — simulate is sync inside useMemo. Kept for the future
  // case where we want to re-simulate on resize.
  useEffect(() => {
    /* layout already finalised */
  }, []);

  if (nodes.length === 0) return null;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div
      ref={containerRef}
      className="bg-card relative overflow-hidden rounded-lg border"
      style={{ width: '100%', maxWidth: width }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img">
        <g>
          {links.map((l, idx) => {
            const a = nodeById.get(l.source);
            const b = nodeById.get(l.target);
            if (!a || !b) return null;
            const active = hover === l.source || hover === l.target;
            return (
              <line
                key={idx}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={active ? 'currentColor' : 'rgb(148 163 184 / 0.4)'}
                className={active ? 'text-primary' : ''}
                strokeWidth={active ? 1.5 : 0.75}
              />
            );
          })}
        </g>
        <g>
          {nodes.map((n) => {
            const hue = hueFromId(n.college_id);
            const d = degree.get(n.id) ?? 0;
            const r = Math.min(14, 4 + Math.sqrt(d) * 2);
            const active = hover === n.id;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover((v) => (v === n.id ? null : v))}
                style={{ cursor: 'pointer' }}
              >
                <Link href={`/researcher/${n.username}` as `/researcher/${string}`}>
                  <circle
                    r={r}
                    fill={`hsl(${hue} 70% 55%)`}
                    stroke={active ? '#0f172a' : 'white'}
                    strokeWidth={active ? 2 : 1}
                  />
                  {active ? (
                    <text
                      x={r + 4}
                      y={4}
                      fontSize={12}
                      fontWeight={600}
                      fill="currentColor"
                      style={{ pointerEvents: 'none' }}
                    >
                      {n.name}
                    </text>
                  ) : null}
                </Link>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

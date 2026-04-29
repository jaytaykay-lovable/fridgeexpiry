import { useMemo } from 'react';
import { motion } from 'framer-motion';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--accent-foreground))',
];

interface Props {
  count?: number;
}

/**
 * Lightweight CSS/Framer-based confetti burst.
 * No external deps required.
 */
export default function Confetti({ count = 60 }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 100,
        y: 100 + Math.random() * 40,
        rot: Math.random() * 720 - 360,
        delay: Math.random() * 0.2,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: `${p.x}vw`,
            y: `${p.y}vh`,
            rotate: p.rot,
            opacity: 0,
          }}
          transition={{
            duration: 1.6 + Math.random() * 0.6,
            delay: p.delay,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

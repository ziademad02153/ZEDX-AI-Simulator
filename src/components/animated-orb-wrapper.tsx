"use client";

import dynamic from 'next/dynamic';

export const AnimatedOrb = dynamic(
  () => import('./animated-orb').then((mod) => mod.AnimatedOrb),
  { ssr: false }
);

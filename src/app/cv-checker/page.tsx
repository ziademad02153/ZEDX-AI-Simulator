import type { Metadata } from 'next';
import { CvWorkspace } from '@/components/cv/workspace';
export const metadata: Metadata = { title: 'ATS CV Checker', description: 'Review common ATS readability and resume-structure issues. Get a score out of 100 and prioritized improvements.' };
export default function CvCheckerPage() { return <CvWorkspace mode="checker" />; }

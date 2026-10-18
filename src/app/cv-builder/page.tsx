import type { Metadata } from 'next';
import { CvWorkspace } from '@/components/cv/workspace';
export const metadata: Metadata = { title: 'CV Builder', description: 'Build, edit and download a clean black-and-white text PDF resume. No interview or AI credits required.' };
export default function CvBuilderPage() { return <CvWorkspace mode="builder" />; }

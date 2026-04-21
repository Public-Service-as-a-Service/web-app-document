import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface SectionHeaderProps {
  title: string;
  meta?: string;
  rightLink?: { href: string; label: string };
}

export const SectionHeader = ({ title, meta, rightLink }: SectionHeaderProps) => (
  <div className="mb-1.5 flex items-baseline justify-between gap-4 border-b border-border pb-2.5">
    <div>
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {meta && <p className="mt-1 text-[12.5px] text-muted-foreground">{meta}</p>}
    </div>
    {rightLink && (
      <Link
        href={rightLink.href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-sm text-[13px] text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {rightLink.label}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    )}
  </div>
);

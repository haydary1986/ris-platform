'use client';

import { Download } from 'lucide-react';
import { useLocale } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';

interface CvDownloadButtonProps {
  username: string;
  label: string;
}

export function CvDownloadButton({ username, label }: CvDownloadButtonProps) {
  const locale = useLocale();
  const href = `/${locale}/researcher/${username}/cv`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
    >
      <Download className="size-4" />
      {label}
    </a>
  );
}

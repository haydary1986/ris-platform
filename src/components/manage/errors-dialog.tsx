'use client';

// Task 98 — Validation errors dialog. Shown when a save action returns
// fieldErrors from the server (defence-in-depth — RHF already validates
// client-side, but Zod re-runs on the server inside actions.ts).

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface FieldErrorEntry {
  field: string;
  message: string;
}

interface ErrorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: FieldErrorEntry[];
}

export function ErrorsDialog({ open, onOpenChange, errors }: ErrorsDialogProps) {
  const t = useTranslations('manage');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('errors_title')}</DialogTitle>
          <DialogDescription>{t('errors_body')}</DialogDescription>
        </DialogHeader>
        <ul className="text-destructive max-h-64 space-y-1 overflow-y-auto text-sm">
          {errors.map((e, i) => (
            <li key={`${e.field}-${i}`}>
              <span className="font-mono text-xs opacity-80">{e.field}</span> — {e.message}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

'use client';

// FIX-10 (P1) — guard against losing unsaved form changes.
//
// `beforeunload` only fires for full navigations (tab close, hard reload).
// Next.js App Router intra-app navigation is hijacked client-side via
// <Link> + router.push, so we additionally:
//   1. Intercept clicks on any in-app <a href="..."> via capture-phase delegation.
//   2. Ignore externals, target=_blank, modifier-keyed clicks, and downloads.
//
// Keep state local to the form: pass `isDirty` from react-hook-form.

import { useEffect } from 'react';

export function useUnsavedChanges(isDirty: boolean, message: string): void {
  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return; // ignore middle/right
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = (e.target as HTMLElement | null)?.closest('a');
      if (!target) return;
      if (target.target && target.target !== '' && target.target !== '_self') return;
      if (target.hasAttribute('download')) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return; // external
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return; // same page (anchor only, etc.)
        }
      } catch {
        return;
      }
      const proceed = window.confirm(message);
      if (!proceed) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClickCapture, true);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, [isDirty, message]);
}

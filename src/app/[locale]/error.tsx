'use client';

import { useEffect } from 'react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[RIS error boundary]', error);
  }, [error]);

  return (
    <main className="container mx-auto flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-red-600">Error caught</h1>
      <pre className="max-w-2xl overflow-auto rounded bg-red-50 p-4 text-left text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
        {error.message}
      </pre>
      {error.stack ? (
        <details className="max-w-2xl w-full">
          <summary className="cursor-pointer text-xs text-gray-500">Stack trace</summary>
          <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-[10px] text-gray-600 dark:bg-gray-900 dark:text-gray-400">
            {error.stack}
          </pre>
        </details>
      ) : null}
      {error.digest ? <p className="text-xs text-gray-500">Digest: {error.digest}</p> : null}
      <button
        onClick={reset}
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </main>
  );
}

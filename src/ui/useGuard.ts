import { useCallback, useRef, useState } from 'react';

/**
 * Prevents double submissions: while a submit handler runs (and briefly after a
 * successful submit), further calls are ignored and `busy` is true so the button can be
 * disabled. A handler that returns `false` (e.g. validation failed) releases at once so
 * the student can fix the form and submit again.
 */
export function useSubmitGuard(): [boolean, (fn: () => boolean | void | Promise<boolean | void>) => Promise<void>] {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const guard = useCallback(async (fn: () => boolean | void | Promise<boolean | void>) => {
    if (running.current) return;
    running.current = true;
    let ok: boolean | void = undefined;
    try {
      ok = await fn();
    } finally {
      if (ok === false) {
        running.current = false;
      } else {
        setBusy(true);
        setTimeout(() => {
          running.current = false;
          setBusy(false);
        }, 400);
      }
    }
  }, []);
  return [busy, guard];
}

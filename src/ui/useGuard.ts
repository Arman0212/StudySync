import { useCallback, useRef, useState } from 'react';

/**
 * Prevents double submissions: while a submit handler runs (and briefly after), further
 * calls are ignored and `busy` is true so the button can be disabled.
 */
export function useSubmitGuard(): [boolean, (fn: () => void | Promise<void>) => Promise<void>] {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const guard = useCallback(async (fn: () => void | Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      await fn();
    } finally {
      setTimeout(() => {
        running.current = false;
        setBusy(false);
      }, 300);
    }
  }, []);
  return [busy, guard];
}

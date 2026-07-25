import { useEffect } from 'react';

// `/` focuses the search box, `n` opens the create modal. Esc is handled
// per-component (Modal/Drawer already close on Escape individually).
export function useKeyboardShortcuts({ searchRef, onNew } = {}) {
  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchRef?.current?.focus();
      } else if ((e.key === 'n' || e.key === 'N') && !isTyping && onNew) {
        e.preventDefault();
        onNew();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [searchRef, onNew]);
}

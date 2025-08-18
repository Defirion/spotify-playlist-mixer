import React, { useState, useEffect, useRef } from 'react';

const ScrollToBottom: React.FC = () => {
  const [showArrow, setShowArrow] = useState(false);
  const [bottomPx, setBottomPx] = useState<number | null>(null);
  const prevInnerHeight = useRef<number>(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  useEffect(() => {
    const checkScrollPosition = (): void => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      // Show arrow if there's content below the fold (more than 100px)
      const contentBelowFold = documentHeight - (scrollTop + windowHeight);
      setShowArrow(contentBelowFold > 100);
    };

    // Check on mount and when content changes
    checkScrollPosition();

    // Check on scroll
    window.addEventListener('scroll', checkScrollPosition);

    // Check when window resizes
    window.addEventListener('resize', checkScrollPosition);

    // -- Keyboard / visual viewport handling --
    // (intentionally minimal keyboard-detection below; CSS-var parsing removed)

    const updateForKeyboard = (): void => {
      // Prefer Visual Viewport API when available
      let keyboardHeight = 0;
      if (window.visualViewport) {
        // keyboard reduces visualViewport.height and may change offsetTop
        const vv = window.visualViewport;
        keyboardHeight = Math.max(
          0,
          window.innerHeight - vv.height - (vv.offsetTop || 0)
        );
      } else {
        // Fallback: detect large shrink in innerHeight (common when keyboard opens)
        const current = window.innerHeight;
        const prev = prevInnerHeight.current || current;
        if (current < prev - 100) {
          keyboardHeight = prev - current;
        } else {
          keyboardHeight = 0;
        }
        prevInnerHeight.current = current;
      }

      if (keyboardHeight > 0) {
        // add a small gap so button sits above keyboard
        const gap = 12; // px
        setBottomPx(Math.ceil(keyboardHeight + gap));
      } else {
        setBottomPx(null);
      }
    };

    // wire visualViewport resize (fires during keyboard show/hide on mobile)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateForKeyboard);
      window.visualViewport.addEventListener('scroll', updateForKeyboard);
    }
    window.addEventListener('resize', updateForKeyboard);

    // Check when DOM changes (new content added)
    const observer = new MutationObserver(checkScrollPosition);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      window.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
      observer.disconnect();
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateForKeyboard);
        window.visualViewport.removeEventListener('scroll', updateForKeyboard);
      }
      window.removeEventListener('resize', updateForKeyboard);
    };
  }, []);

  const scrollToBottom = (): void => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  if (!showArrow) return null;

  const style: React.CSSProperties | undefined = {};
  if (bottomPx != null) {
    style.bottom = `${bottomPx}px`;
  }

  return (
    <button
      className="scroll-to-bottom"
      onClick={scrollToBottom}
      title="Scroll to see new content"
      style={style}
    >
      ↓
    </button>
  );
};

export default ScrollToBottom;

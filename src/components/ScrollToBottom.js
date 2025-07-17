import React, { useState, useEffect } from 'react';

const ScrollToBottom = () => {
  const [showArrow, setShowArrow] = useState(false);

  useEffect(() => {
    const checkScrollPosition = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
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
    
    // Check when DOM changes (new content added)
    const observer = new MutationObserver(checkScrollPosition);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true 
    });

    return () => {
      window.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
      observer.disconnect();
    };
  }, []);

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  if (!showArrow) return null;

  return (
    <button
      className="scroll-to-bottom"
      onClick={scrollToBottom}
      title="Scroll to see new content"
    >
      ↓
    </button>
  );
};

export default ScrollToBottom;
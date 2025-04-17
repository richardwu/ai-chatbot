import { useEffect, useRef, useState, type RefObject } from 'react';

export function useScrollToBottom<T extends HTMLElement>(): [
  RefObject<T>,
  RefObject<T>,
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const initialRenderRef = useRef(true);

  // Function to check if user is near bottom
  const isNearBottom = () => {
    const container = containerRef.current;
    if (!container) return false;

    const threshold = 150; // pixels from bottom to consider "near bottom"
    const position =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return position <= threshold;
  };

  // Handle manual scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShouldAutoScroll(isNearBottom());
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Initial scroll to bottom on first render
  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end && initialRenderRef.current) {
      // Ensure we scroll to bottom on initial render
      end.scrollIntoView({ behavior: 'instant', block: 'end' });
      initialRenderRef.current = false;
    }
  }, []);

  // Handle content changes
  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end) {
      const observer = new MutationObserver(() => {
        // Only auto-scroll if we're already near the bottom
        if (shouldAutoScroll) {
          end.scrollIntoView({ behavior: 'instant', block: 'end' });
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return () => observer.disconnect();
    }
  }, [shouldAutoScroll]);

  return [containerRef, endRef];
}

import { useState, useEffect, useRef } from 'react';

export function useReviewTimer() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const isRunningRef = useRef(true);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      if (isRunningRef.current) {
        const now = Date.now();
        setElapsedMs((prev) => prev + (now - lastTickRef.current));
        lastTickRef.current = now;
      }
    }, 1000);

    const handleFocus = () => {
      lastTickRef.current = Date.now();
      isRunningRef.current = true;
    };

    const handleBlur = () => {
      isRunningRef.current = false;
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    elapsedMs,
    formattedTime: formatTime(elapsedMs),
    reset: () => {
      setElapsedMs(0);
      lastTickRef.current = Date.now();
    },
  };
}

import { useState, useRef, useCallback } from 'react';

export const useLongPress = (
  onLongPress: () => void,
  onShortPress?: () => void,
  delay = 500
) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout>();

  const start = useCallback(() => {
    setLongPressTriggered(false);
    timeout.current = setTimeout(() => {
      onLongPress();
      setLongPressTriggered(true);
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    if (!longPressTriggered && onShortPress) {
      onShortPress();
    }
  }, [longPressTriggered, onShortPress]);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: clear,
    onTouchEnd: clear,
    onMouseLeave: clear,
  };
};
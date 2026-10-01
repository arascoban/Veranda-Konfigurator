import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Small "i" that shows its explanation on hover or focus. The bubble is rendered at document level and
 * kept inside the viewport, so it never runs off the left or right edge of the panel.
 */
export function InfoTip({ text }: { text: string }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    if (!open || !anchor.current || !bubble.current) return;
    const dot = anchor.current.getBoundingClientRect();
    const width = bubble.current.offsetWidth;
    const height = bubble.current.offsetHeight;
    const margin = 8;
    let left = dot.left + dot.width / 2 - width / 2;
    left = Math.max(margin, Math.min(window.innerWidth - width - margin, left));
    let top = dot.bottom + 6;
    if (top + height > window.innerHeight - margin) top = dot.top - height - 6;
    setPosition({ left, top });
  }, [open, text]);
  return (
    <>
      <span ref={anchor} className="info-dot" tabIndex={0} role="note" aria-label={text}
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>i</span>
      {open && createPortal(
        <div ref={bubble} className="info-tip-bubble" role="tooltip" style={{ left: position.left, top: position.top }}>{text}</div>,
        document.body,
      )}
    </>
  );
}

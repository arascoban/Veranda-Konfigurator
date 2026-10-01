/** Small "i" that shows its explanation on hover or focus; used instead of help paragraphs (user request 1 Oct 2026). */
export function InfoTip({ text }: { text: string }) {
  return <span className="info-dot" tabIndex={0} role="note" aria-label={text} data-tip={text}>i</span>;
}

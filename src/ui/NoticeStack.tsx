import { useEffect } from 'react';
import { useNoticeStore, type Notice } from '../state/noticeStore';
import { Icon } from './Icon';

/** Floating notices over the 3D view; the bar under each one runs down and closes it. */
export function NoticeStack() {
  const notices = useNoticeStore((state) => state.notices);
  if (!notices.length) return null;
  return (
    <div className="notice-stack" aria-live="polite">
      {notices.map((notice) => <NoticeCard key={notice.id} notice={notice} />)}
    </div>
  );
}

function NoticeCard({ notice }: { notice: Notice }) {
  const dismiss = useNoticeStore((state) => state.dismiss);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(notice.id), notice.durationMs);
    return () => window.clearTimeout(timer);
  }, [dismiss, notice.id, notice.durationMs]);
  return (
    <div className="notice-card" role="status">
      <div className="notice-card__head">
        <strong>{notice.title}</strong>
        <button type="button" className="notice-card__close" aria-label="Hinweis schließen" onClick={() => dismiss(notice.id)}><Icon name="close" /></button>
      </div>
      <p>{notice.message}</p>
      <span className="notice-card__bar" style={{ animationDuration: `${notice.durationMs}ms` }} aria-hidden="true" />
    </div>
  );
}

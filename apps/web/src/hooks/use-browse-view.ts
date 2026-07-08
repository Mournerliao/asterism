import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { getBrowseView, type RepoViewMode, setBrowseViewPersisted } from '../stores/browse-view';

/**
 * Browse 视图切换分两步：tab 本地状态立即响应，内容视图延后到下一次
 * paint 后再以 transition 提交，避免虚拟列表测量抢占 tab 反馈。
 */
export function useBrowseView() {
  const [view, setView] = useState<RepoViewMode>(() => getBrowseView());
  const [, startTransition] = useTransition();
  const scheduledFrameRef = useRef<number | null>(null);

  const cancelScheduledTransition = useCallback(() => {
    if (scheduledFrameRef.current != null) {
      cancelAnimationFrame(scheduledFrameRef.current);
      scheduledFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    setBrowseViewPersisted(view);
  }, [view]);

  useEffect(() => cancelScheduledTransition, [cancelScheduledTransition]);

  const transitionTo = useCallback(
    (next: RepoViewMode) => {
      cancelScheduledTransition();

      scheduledFrameRef.current = requestAnimationFrame(() => {
        scheduledFrameRef.current = requestAnimationFrame(() => {
          scheduledFrameRef.current = null;
          startTransition(() => setView(next));
        });
      });
    },
    [cancelScheduledTransition],
  );

  return {
    view,
    transitionTo,
  };
}

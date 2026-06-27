type RefreshCallback = (source?: string) => void;

const listeners = new Set<RefreshCallback>();

export function onDataRefresh(cb: RefreshCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function triggerDataRefresh(source?: string) {
  listeners.forEach((cb) => cb(source));
}

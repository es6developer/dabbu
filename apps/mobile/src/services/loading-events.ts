type Listener = (active: number) => void;

let activeRequests = 0;
const listeners = new Set<Listener>();

export const GlobalLoading = {
  get count() {
    return activeRequests;
  },

  increment() {
    activeRequests++;
    listeners.forEach((fn) => fn(activeRequests));
  },

  decrement() {
    activeRequests = Math.max(0, activeRequests - 1);
    listeners.forEach((fn) => fn(activeRequests));
  },

  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },

  reset() {
    activeRequests = 0;
    listeners.forEach((fn) => fn(0));
  },
};

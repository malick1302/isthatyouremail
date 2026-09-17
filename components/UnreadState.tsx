"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type UnreadState = {
  overrides: Record<string, boolean>;
  setUnread: (threadId: string, unread: boolean) => void;
};

const UnreadStateContext = createContext<UnreadState>({
  overrides: {},
  setUnread: () => {},
});

export function UnreadStateProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const setUnread = useCallback((threadId: string, unread: boolean) => {
    setOverrides((prev) => ({ ...prev, [threadId]: unread }));
  }, []);
  const value = useMemo(() => ({ overrides, setUnread }), [overrides, setUnread]);
  return <UnreadStateContext.Provider value={value}>{children}</UnreadStateContext.Provider>;
}

export function useUnreadState(threadId: string, serverUnread: boolean) {
  const { overrides, setUnread } = useContext(UnreadStateContext);
  const unread = Object.hasOwn(overrides, threadId) ? overrides[threadId] : serverUnread;
  return [unread, (next: boolean) => setUnread(threadId, next)] as const;
}

export function useSetUnread() {
  return useContext(UnreadStateContext).setUnread;
}

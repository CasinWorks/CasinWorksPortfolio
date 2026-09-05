import { useEffect, useState } from "react";
import { usePortalAuth } from "./auth";
import { countUnreadThreads, listenThreads } from "./api";

/**
 * Live count of conversations waiting on the signed-in user.
 *
 * Used by the portal nav and the admin inbox so an unanswered client message is
 * visible without opening Messages.
 */
export function useUnreadThreadCount() {
  const { profile } = usePortalAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!profile) {
      setCount(0);
      return;
    }
    const viewer = profile.role === "admin" ? "admin" : "client";
    return listenThreads(
      { role: profile.role, email: profile.email },
      (rows) => setCount(countUnreadThreads(rows, viewer)),
      // A rules or network error must not break the chrome it renders into.
      () => setCount(0),
    );
  }, [profile]);

  return count;
}

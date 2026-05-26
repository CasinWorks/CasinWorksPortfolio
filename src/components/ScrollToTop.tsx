import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scroll window to top on route change (e.g. Read more → case study page). */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

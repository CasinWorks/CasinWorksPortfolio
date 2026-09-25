import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scroll to top on route change, or to the hash target when one is present. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";

    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior, block: "start" });
      scroll();
      // Home sections may not be painted on the first tick after a redirect.
      const t = window.setTimeout(scroll, 100);
      return () => clearTimeout(t);
    }
    // Instant on route change so leaving a deep page doesn’t animate the whole height.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}

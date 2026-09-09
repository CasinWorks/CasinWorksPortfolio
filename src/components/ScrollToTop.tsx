import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scroll to top on route change, or to the hash target when one is present. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      const scroll = () => document.getElementById(id)?.scrollIntoView();
      scroll();
      // Home sections may not be painted on the first tick after a redirect.
      const t = window.setTimeout(scroll, 100);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

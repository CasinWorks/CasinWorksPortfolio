import { useEffect } from "react";

type JsonLdProps = {
  id: string;
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** Inject (and replace) a JSON-LD script tag in document head. */
export function JsonLd({ id, data }: JsonLdProps) {
  useEffect(() => {
    const scriptId = `jsonld-${id}`;
    let el = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = scriptId;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);

    return () => {
      el?.remove();
    };
  }, [id, data]);

  return null;
}

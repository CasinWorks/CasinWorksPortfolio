import { useEffect } from "react";
import { SITE } from "../site";

export type PageMetaInput = {
  title?: string;
  description?: string;
  path?: string;
  /** Absolute or site-relative image URL */
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Keep document title + primary meta tags in sync with the active route. */
export function usePageMeta({
  title,
  description,
  path = "/",
  image,
  type = "website",
  noIndex = false,
}: PageMetaInput) {
  useEffect(() => {
    const pageTitle = title ?? SITE.title;
    const pageDescription = description ?? SITE.description;
    const canonical = new URL(path, SITE.url).toString();
    const ogImage = new URL(image ?? SITE.ogImagePath, SITE.url).toString();

    document.title = pageTitle;

    upsertMeta("name", "description", pageDescription);
    upsertMeta("name", "robots", noIndex ? "noindex, nofollow" : "index, follow");

    upsertMeta("property", "og:title", pageTitle);
    upsertMeta("property", "og:description", pageDescription);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("property", "og:site_name", SITE.title);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", pageTitle);
    upsertMeta("name", "twitter:description", pageDescription);
    upsertMeta("name", "twitter:image", ogImage);

    upsertLink("canonical", canonical);
  }, [title, description, path, image, type, noIndex]);
}

import { useMemo } from "react";
import { JsonLd } from "./JsonLd";
import { SITE } from "../site";

/** Sitewide Person + ProfessionalService structured data. */
export function SiteSchema() {
  const data = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": `${SITE.url}/#person`,
        name: SITE.name,
        url: SITE.url,
        email: SITE.email,
        jobTitle: "Independent Software Engineer",
        description: SITE.description,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Mandaluyong",
          addressCountry: "PH",
        },
        worksFor: {
          "@id": `${SITE.url}/#service`,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "@id": `${SITE.url}/#service`,
        name: SITE.title,
        url: SITE.url,
        description: SITE.description,
        image: `${SITE.url}${SITE.ogImagePath}`,
        email: SITE.email,
        areaServed: ["PH", "Worldwide"],
        address: {
          "@type": "PostalAddress",
          addressLocality: "Mandaluyong",
          addressCountry: "PH",
        },
        founder: {
          "@id": `${SITE.url}/#person`,
        },
      },
    ],
    [],
  );

  return <JsonLd id="site" data={data} />;
}

import { useMemo } from "react";
import { JsonLd } from "./JsonLd";
import { CASE_STUDY_LIST, CONCEPT_STUDY_LIST, caseStudyPath, SITE } from "../site";

/** Sitewide Person + Organization + ProfessionalService structured data. */
export function SiteSchema() {
  const data = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": `${SITE.url}/#person`,
        name: SITE.fullName,
        alternateName: [SITE.name, "C.J. Casin", SITE.brand],
        givenName: "Christian",
        additionalName: "Joshua",
        familyName: "Casin",
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
          "@id": `${SITE.url}/#organization`,
        },
        workExample: [...CASE_STUDY_LIST, ...CONCEPT_STUDY_LIST].map((item) => ({
          "@type": "CreativeWork",
          name: item.title,
          description: item.snippet,
          url: `${SITE.url}${caseStudyPath(item.slug)}`,
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${SITE.url}/#organization`,
        name: SITE.brand,
        url: SITE.url,
        description: SITE.description,
        email: SITE.email,
        founder: {
          "@id": `${SITE.url}/#person`,
        },
        areaServed: ["PH", "Worldwide"],
        address: {
          "@type": "PostalAddress",
          addressLocality: "Mandaluyong",
          addressCountry: "PH",
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
        parentOrganization: {
          "@id": `${SITE.url}/#organization`,
        },
      },
    ],
    [],
  );

  return <JsonLd id="site" data={data} />;
}

/** Site-wide contact */
export const SITE = {
  email: "christianjoshuacasin@gmail.com",
  tagline: "We make things work",
  /**
   * Google Apps Script Web App URL that receives inquiry submissions and writes
   * them to a Google Sheet. See docs/google-sheets-inquiry.md.
   */
  inquiryEndpoint: (import.meta.env.VITE_INQUIRY_ENDPOINT as string | undefined) ?? "",
} as const;

/** Strategic partners (not client logos — institutional credibility) */
export const PARTNERS = {
  pfs: {
    name: "PFS Automation Microsystems Inc.",
    url: "https://pfsautomation.com",
  },
} as const;

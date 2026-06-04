/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AppCaseStudyDetails {
  primaryOutcome: string;
  problem: string[];
  solution: string[];
  keyFeatures: string[];
  feasibility: string[];
  nextSteps?: string[];
}

export interface AppItem {
  id: string;
  name: string;
  category: string;
  status: "LIVE";
  demoLabel?: string;
  caseStudy?: boolean;
  description: string;
  url: string;
  role?: string;
  releaseDate?: string;
  technologies?: string[];
  details?: AppCaseStudyDetails;
}

export interface DesignColor {
  name: string;
  slug: string;
  hex: string;
  role: string;
}

export interface DesignTypo {
  level: string;
  fontFamily: string;
  size: string;
  weight: string;
  useCase: string;
}

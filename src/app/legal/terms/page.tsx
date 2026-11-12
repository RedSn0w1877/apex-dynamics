// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms governing use of the Apex Dynamics concept site by HVNF Studios.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="October 31, 2026"
      sections={[
        {
          heading: "Concept project",
          body: (
            <p>
              This website is a portfolio demonstration created by HVNF Studios. Apex Dynamics is a fictional brand.
              No products are manufactured, offered for sale, or shipped, and no contract is formed by using any part
              of this site, including the field-test bib form.
            </p>
          ),
        },
        {
          heading: "Ownership",
          body: (
            <p>
              All source code, visual design, interactive telemetry visualizations, 3D models and renders, written
              copy, and brand marks on this site are © 2026 HVNF Studios. All rights reserved.
            </p>
          ),
        },
        {
          heading: "Permitted use",
          body: (
            <>
              <p>You may view this site in a web browser for personal evaluation of HVNF Studios&apos; work.</p>
              <p>
                You may not copy, redistribute, republish, resell, frame, scrape, or reuse any part of this site or its
                code, including as a template, in client work, or in datasets used to train software, without written
                permission from HVNF Studios.
              </p>
            </>
          ),
        },
        {
          heading: "Illustrative information",
          body: (
            <p>
              Telemetry samples, wind figures, layer weights and material descriptions are illustrative and do not
              describe a real product or a real athlete&apos;s data. The site is provided as-is, without warranties of
              any kind.
            </p>
          ),
        },
        {
          heading: "Downloads",
          body: (
            <p>
              The bib image you can save is drawn in your browser from what you typed. It carries an HVNF Studios
              notice and may not be redistributed.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: <p>Licensing and project enquiries should be directed to HVNF Studios through its official channels.</p>,
        },
      ]}
    />
  );
}

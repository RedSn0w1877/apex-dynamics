// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How the Apex Dynamics concept site by HVNF Studios handles data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy notice"
      updated="October 31, 2026"
      sections={[
        {
          heading: "What the bib form does",
          body: (
            <p>
              Names, email addresses, distances and sizes you enter stay in your browser&apos;s memory. They are never
              sent to a server, stored or shared, and never appear in the page address. The bib image you save is
              drawn on your device. Reloading the page clears everything.
            </p>
          ),
        },
        {
          heading: "Cookies and analytics",
          body: <p>This site sets no cookies and runs no analytics, advertising, or tracking scripts.</p>,
        },
        {
          heading: "Telemetry data",
          body: (
            <p>
              The stride chart renders a fixed, illustrative data set bundled with the site. It does not read from any
              wearable device, does not access your location, and does not connect to any athlete&apos;s real training
              data.
            </p>
          ),
        },
        {
          heading: "Third-party requests",
          body: (
            <p>
              None. Fonts, images, the 3D model and its decoder are served from this site&apos;s own address. The host
              (GitHub Pages) keeps standard server logs, such as IP address and user agent, under its own policy.
            </p>
          ),
        },
        {
          heading: "Questions",
          body: <p>Privacy questions about this concept site can be sent to HVNF Studios through its official channels.</p>,
        },
      ]}
    />
  );
}

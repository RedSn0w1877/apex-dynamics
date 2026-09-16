// © 2026 HVNF Studios. All rights reserved. Portfolio sample — do not redistribute.

import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How the APEX DYNAMICS concept site by HVNF Studios handles data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy notice"
      updated="September 16, 2026"
      sections={[
        {
          heading: "What the form does",
          body: (
            <p>
              The field allocation form is a front-end demonstration. Names, email addresses, race distances, and
              shoe sizes you enter are validated in your browser and never transmitted to a server, stored, or
              shared. Reloading the page clears them.
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
              The stride HUD renders a fixed, illustrative data set bundled with the site. It does not read from
              any wearable device, does not access your location, and does not connect to any athlete&apos;s real
              training data.
            </p>
          ),
        },
        {
          heading: "Third-party requests",
          body: (
            <p>
              Fonts are served from this site&apos;s own domain. The hosting provider keeps standard server logs
              (such as IP address and user agent) for security and performance. That provider handles that data
              under its own policy.
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

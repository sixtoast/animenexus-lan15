"use client";

import { FeatureTip } from "@/components/FeatureTip";
import type { OnboardingFeature } from "@/lib/onboarding-seen";

/** Thin client host so server pages can show contextual tips. */
export function OnboardingTip({ feature }: { feature: OnboardingFeature }) {
  return <FeatureTip feature={feature} />;
}

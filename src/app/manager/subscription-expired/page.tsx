export const dynamic = 'force-dynamic';
import React from "react";
import { getManagerSession } from "@/lib/manager-actions";
import { SubscriptionExpiredClient } from "@/components/manager/SubscriptionExpiredClient";

export default async function SubscriptionExpiredPage() {
  // Fetch session data directly on the server
  const session = await getManagerSession();
  const restoName = session?.nom || "Votre restaurant";

  return <SubscriptionExpiredClient restoName={restoName} />;
}

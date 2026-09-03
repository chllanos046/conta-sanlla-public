"use client";
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// Returns false during SSR/hydration and true once mounted on the client,
// without setState-in-effect (avoids a hydration-mismatch render flash).
export function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

import { StoreSkeleton } from "@/components/store-skeleton";

/** Shown while a shop route is loading, so the page is not a blank gap. */
export default function StoreLoading() {
  return <StoreSkeleton />;
}

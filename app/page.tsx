import { KiaStickApp } from "@/components/KiaStickApp";
import { getRuntimeVersion } from "@/lib/serverVersion";

export const dynamic = "force-dynamic";

export default function Home() {
  return <KiaStickApp runtimeVersion={getRuntimeVersion()} />;
}

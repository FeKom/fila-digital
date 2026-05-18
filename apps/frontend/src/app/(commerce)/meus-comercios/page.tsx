import { getUserCommerces } from "@/domains/commerce/commerce.actions";
import { getUserQueues } from "@/domains/queue/queue.actions";
import { MeusComerciosDashboard } from "./MeusComerciosDashboard";

export default async function MeusComerciosPage() {
  const [commerces, queues] = await Promise.all([
    getUserCommerces(),
    getUserQueues(),
  ]);

  return <MeusComerciosDashboard commerces={commerces} queues={queues} />;
}

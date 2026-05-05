import { authApi } from "@/lib/api";
import { Commerce, CommerceInput, NearbyCommerce } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

const commerceService = () => {
  return {
    register: async (data: CommerceInput) => {
      const payload = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== "" && v != null)
      );
      const response = await authApi("/commerce/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as {
        commerce_id?: string;
        id?: string;
        name?: string;
        message?: string;
      };
      if (!response.ok)
        throw new Error(json.message ?? "Failed to register commerce");
      return { id: json.id ?? json.commerce_id, name: json.name } as Commerce;
    },
    list: async () => {
      const response = await authApi("/commerce");
      return (await response.json()) as Commerce[];
    },
    getById: async (commerceId: string) => {
      const response = await authApi(`/commerce/${commerceId}`);
      return (await response.json()) as Commerce;
    },
    getUserCommerces: async () => {
      const response = await authApi("/user/commerces");
      const json = (await response.json()) as { commerces?: Commerce[] };
      return json.commerces ?? [];
    },
    update: async (commerceId: string, data: Partial<CommerceInput>) => {
      const response = await authApi(`/commerce/${commerceId}/update`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return (await response.json()) as Commerce;
    },
    delete: async (commerceId: string) => {
      const response = await authApi(`/commerce/${commerceId}/delete`, {
        method: "DELETE",
      });
      return response.json();
    },
    nearby: async (
      lat: number,
      lng: number,
      radius = 5000
    ): Promise<NearbyCommerce[]> => {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(radius),
      });
      const response = await fetch(
        `${BASE_URL}/v1/commerce/nearby?${params.toString()}`
      );
      if (!response.ok) return [];
      return response.json() as Promise<NearbyCommerce[]>;
    },
  };
};

export default commerceService;

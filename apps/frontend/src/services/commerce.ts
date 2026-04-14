import { authApi } from "@/lib/api";
import { Commerce, CommerceInput } from "@/types";

const commerceService = () => {
  return {
    register: async (data: CommerceInput) => {
      const response = await authApi("/commerce/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return (await response.json()) as Commerce;
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
  };
};

export default commerceService;

export type DashboardSearchResponse = {
  orders: Array<{ id: string; order_number: string; subtitle: string }>;
  clients: Array<{ id: string; full_name: string; subtitle: string | null }>;
  inventory: Array<{ id: string; name: string; sku: string; subtitle: string | null }>;
  services: Array<{ id: string; name: string }>;
  profiles: Array<{ id: string; full_name: string; role: string }>;
};

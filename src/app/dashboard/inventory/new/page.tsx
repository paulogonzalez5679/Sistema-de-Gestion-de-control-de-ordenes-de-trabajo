import { InventoryForm } from "@/components/inventory-form";

export default function NewInventoryPage() {
  return (
    <div className="row">
      <h1 style={{ margin: 0 }}>Nuevo artículo de inventario</h1>
      <InventoryForm mode="create" />
    </div>
  );
}

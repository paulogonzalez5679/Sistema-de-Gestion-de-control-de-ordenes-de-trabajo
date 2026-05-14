import { notFound } from "next/navigation";
import { InventoryForm } from "@/components/inventory-form";
import { InventoryMovements } from "@/components/inventory-movements";
import { getInventoryById } from "@/modules/inventory/inventory.service";

type Params = { params: Promise<{ id: string }> };

export default async function EditInventoryPage({ params }: Params) {
  const { id } = await params;
  const item = await getInventoryById(id);
  if (!item) notFound();

  const stockValue = Number(item.unit_cost) * Number(item.quantity);

  return (
    <div className="row">
      <h1 style={{ margin: 0 }}>Artículo — {item.name}</h1>
      <div className="row three">
        <div className="card">
          <div style={{ color: "#b9accf" }}>SKU</div>
          <strong>{item.sku}</strong>
        </div>
        <div className="card">
          <div style={{ color: "#b9accf" }}>Existencias</div>
          <strong>
            {item.quantity} uds. (Punto de reposición {item.reorder_point})
          </strong>
        </div>
        <div className="card">
          <div style={{ color: "#b9accf" }}>Valor en stock</div>
          <strong>${stockValue.toFixed(2)}</strong>
        </div>
      </div>
      <InventoryForm mode="edit" initialItem={item} />
      <InventoryMovements itemId={id} />
    </div>
  );
}

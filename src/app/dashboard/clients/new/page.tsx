import { Suspense } from "react";
import { ClientRegistrationWizard } from "@/components/client-registration-wizard";

export default function NewClientRegistrationPage() {
  return (
    <Suspense fallback={<p style={{ color: "#b9accf", padding: 24 }}>Cargando registro…</p>}>
      <ClientRegistrationWizard />
    </Suspense>
  );
}

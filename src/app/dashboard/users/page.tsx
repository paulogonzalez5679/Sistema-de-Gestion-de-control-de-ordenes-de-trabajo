import Link from "next/link";
import { redirect } from "next/navigation";
import { ListPagination } from "@/components/list-pagination";
import { ModuleListSearch } from "@/components/module-list-search";
import { UsersStaffView } from "@/components/users-staff-view";
import { DEFAULT_LIST_PAGE_SIZE, offsetForPage, parsePageParam } from "@/lib/pagination";
import { firstSearchQuery } from "@/lib/search-params";
import { canManageUsers } from "@/lib/roles";
import { getSessionProfile } from "@/lib/session-profile";
import { listProfilesPage } from "@/modules/profiles/profile.service";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UsersManagementPage({ searchParams }: Props) {
  const session = await getSessionProfile();
  if (!canManageUsers(session?.role)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const page = parsePageParam(sp.page);
  const pageSize = DEFAULT_LIST_PAGE_SIZE;
  const offset = offsetForPage(page, pageSize);
  const q = firstSearchQuery(sp);
  const { profiles: users, total } = await listProfilesPage({ limit: pageSize, offset, search: q || undefined });

  return (
    <div className="staff-page">
      <header className="staff-page__header">
        <div>
          <p className="staff-page__eyebrow">Administración</p>
          <h1 className="staff-page__title">Staff y accesos</h1>
          <p className="staff-page__lead">Usuarios internos del taller y roles. Haz clic en una fila para ver el detalle.</p>
        </div>
        <Link className="button staff-page__cta" href="/dashboard/users/new">
          Nuevo usuario
        </Link>
      </header>

      <div className="staff-page__toolbar">
        <ModuleListSearch
          actionPath="/dashboard/users"
          defaultQuery={q}
          placeholder="Nombre o rol del usuario…"
        />
      </div>

      <UsersStaffView users={users} hasSearchFilter={Boolean(q)} />
      <ListPagination pathname="/dashboard/users" searchParams={sp} page={page} pageSize={pageSize} total={total} />

      <p className="staff-page__footnote">
        Solo los administradores pueden crear, editar o eliminar usuarios. Los cambios de rol aplican al iniciar sesión de nuevo en la mayoría de los casos.
      </p>
    </div>
  );
}

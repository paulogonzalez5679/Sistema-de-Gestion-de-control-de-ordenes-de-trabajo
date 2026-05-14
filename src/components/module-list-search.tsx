import Link from "next/link";

type Props = {
  actionPath: string;
  defaultQuery: string;
  placeholder: string;
};

/**
 * Búsqueda por GET (`q`) en listados de dashboard; al enviar se reinicia la paginación.
 */
export function ModuleListSearch({ actionPath, defaultQuery, placeholder }: Props) {
  const q = defaultQuery.trim();
  return (
    <form className="module-list-search" method="get" action={actionPath} role="search">
      <input
        type="search"
        name="q"
        className="input module-list-search__input"
        defaultValue={defaultQuery}
        placeholder={placeholder}
        maxLength={120}
        aria-label="Buscar en este listado"
      />
      <button type="submit" className="button secondary module-list-search__submit">
        Buscar
      </button>
      {q ? (
        <Link className="button secondary module-list-search__clear" href={actionPath}>
          Limpiar
        </Link>
      ) : null}
    </form>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { ApiResponse, ListOptions } from "../api";

export function useResource<T>(
  load: () => Promise<ApiResponse<T>>,
  keys: unknown[] = [],
) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    data?: T;
    total: number;
    loading: boolean;
    error?: string;
  }>({ total: 0, loading: true });
  useEffect(() => {
    let current = true;
    setState({ total: 0, loading: true });
    load()
      .then((result) => {
        if (current)
          setState({
            data: result.data,
            total: result.total ?? 0,
            loading: false,
          });
      })
      .catch((error) => {
        if (current)
          setState({
            total: 0,
            loading: false,
            error: error instanceof Error ? error.message : "Request failed.",
          });
      });
    return () => {
      current = false;
    };
  }, [...keys, revision]);
  return { ...state, reload: () => setRevision((value) => value + 1) };
}
export function ResourceState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error?: string;
  retry: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="state-panel" role="status">
        <span className="loading-dot" /> Loading records…
      </div>
    );
  if (error)
    return (
      <div className="state-panel error-panel" role="alert">
        <strong>Unable to complete this request</strong>
        <p>{error}</p>
        <div className="flex gap-2">
          <button className="admin-btn" onClick={retry}>
            Try again
          </button>
          <a className="admin-btn" href="/cdn-cgi/access/logout">
            Sign in again
          </a>
        </div>
      </div>
    );
  return <>{children}</>;
}
export function PageHeader({
  eyebrow = "Administration",
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`admin-badge badge-${value.replace(/[^a-z]/g, "")}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}
export function useListOptions() {
  const [params, setParams] = useSearchParams();
  const offset = Math.max(0, Number(params.get("offset")) || 0);
  const search = params.get("search") ?? "";
  const status = params.get("status") ?? "";
  const options: ListOptions = { limit: 25, offset, search, status };
  function update(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "offset") next.delete("offset");
      return next;
    });
  }
  return {
    options,
    key: JSON.stringify(options),
    update,
    page: (offset: number) => update("offset", String(offset)),
  };
}
export function ListToolbar({
  search,
  status,
  statuses,
  onSearch,
  onStatus,
  onRefresh,
}: {
  search: string;
  status?: string;
  statuses?: string[];
  onSearch: (value: string) => void;
  onStatus?: (value: string) => void;
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  return (
    <div className="list-toolbar">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(draft.trim());
        }}
        className="search-form"
      >
        <input
          aria-label="Search records"
          className="admin-input"
          type="search"
          placeholder="Search by name or ID…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="admin-btn" type="submit">
          Search
        </button>
      </form>
      <div className="flex gap-2">
        {statuses && (
          <select
            aria-label="Filter by status"
            className="admin-input"
            value={status}
            onChange={(event) => onStatus?.(event.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        )}
        <button className="admin-btn" onClick={onRefresh}>
          Refresh
        </button>
      </div>
    </div>
  );
}

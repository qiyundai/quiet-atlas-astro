import { Link } from "react-router-dom";
import type { ReactNode } from "react";
export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}
interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  linkTo?: (row: T) => string;
  total?: number;
  limit?: number;
  offset?: number;
  onPageChange?: (offset: number) => void;
}
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  linkTo,
  total,
  limit = 25,
  offset = 0,
  onPageChange,
}: DataTableProps<T>) {
  return (
    <div className="table-card">
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Records"
      >
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th scope="col" key={col.key}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty-state">
                    <strong>No records found</strong>
                    <p>Try another search or filter.</p>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((col, i) => {
                  const content = col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? "—");
                  return (
                    <td key={col.key}>
                      {i === 0 && linkTo ? (
                        <Link className="record-link" to={linkTo(row)}>
                          {content}
                          <span aria-hidden="true"> ↗</span>
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total !== undefined && onPageChange && (
        <div className="table-footer">
          <span>
            {total === 0
              ? "0 records"
              : `${Math.min(offset + 1, total)}–${Math.min(offset + rows.length, total)} of ${total.toLocaleString()} records`}
          </span>
          <div className="flex gap-2">
            <button
              className="admin-btn"
              disabled={offset === 0}
              onClick={() => onPageChange(Math.max(0, offset - limit))}
            >
              Previous
            </button>
            <button
              className="admin-btn"
              disabled={offset + limit >= total}
              onClick={() => onPageChange(offset + limit)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

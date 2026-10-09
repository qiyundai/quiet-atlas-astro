import { useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchInviteCodes,
  createInviteCodes,
  deleteInviteCode,
  type InviteCode,
} from "../api";
import { Confirm } from "../components/Confirm";
import { DataTable, type Column } from "../components/DataTable";
import {
  ListToolbar,
  PageHeader,
  ResourceState,
  useListOptions,
  useResource,
  Badge,
} from "../components/Resource";
import { formatDateTime } from "../format";
export function InviteCodes() {
  const list = useListOptions();
  const resource = useResource(
    () => fetchInviteCodes(list.options),
    [list.key],
  );
  const [count, setCount] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  async function generate() {
    if (busy) return;
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const result = await createInviteCodes(Number(count));
      setCreated(result.data?.codes ?? []);
      resource.reload();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not create codes.",
      );
    } finally {
      setBusy(false);
    }
  }
  const columns: Column<InviteCode>[] = [
    {
      key: "code",
      label: "Invite code",
      render: (row) => <code>{row.code}</code>,
    },
    {
      key: "is_admin_generated",
      label: "Source",
      render: (row) =>
        row.is_admin_generated ? "Administrator" : "Player invite",
    },
    {
      key: "used_by",
      label: "Status",
      render: (row) => <Badge value={row.used_by ? "used" : "available"} />,
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: "redeemed",
      label: "Redeemed by",
      render: (row) =>
        row.used_by && row.used_by !== "[deleted]" ? (
          <Link className="text-link" to={`/users/${row.used_by}`}>
            {row.used_by}
          </Link>
        ) : (
          (row.used_by ?? "—")
        ),
    },
    {
      key: "used_at",
      label: "Redeemed",
      render: (row) => formatDateTime(row.used_at),
    },
    {
      key: "actions",
      label: "Action",
      render: (row) =>
        !row.used_by && (
          <button
            className="admin-btn admin-btn-danger"
            onClick={() => setTarget(row.code)}
          >
            Delete
          </button>
        ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Invite codes"
        description="Create invitations and follow their journey from issued to redeemed."
      />
      <section className="admin-surface invite-generator">
        <div>
          <h2>Create invitations</h2>
          <p>Generate up to 50 single-use codes at a time.</p>
        </div>
        <form
          className="flex gap-2 items-center"
          onSubmit={(event) => {
            event.preventDefault();
            void generate();
          }}
        >
          <label htmlFor="invite-count" className="sr-only">
            Number of invitations
          </label>
          <input
            id="invite-count"
            type="number"
            min={1}
            max={50}
            required
            step={1}
            className="admin-input"
            value={count}
            onChange={(event) => setCount(event.target.value)}
          />
          <button className="admin-btn admin-btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create codes"}
          </button>
        </form>
      </section>
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
      {created.length > 0 && (
        <section className="success-note" role="status">
          <div className="section-heading">
            <strong>{created.length} invitations created</strong>
            <button
              className="admin-btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(created.join("\n"));
                  setCopied(true);
                } catch {
                  setError(
                    "Clipboard unavailable. Select and copy the codes below.",
                  );
                }
              }}
            >
              {copied ? "Copied" : "Copy codes"}
            </button>
          </div>
          <pre className="generated-codes">{created.join("\n")}</pre>
        </section>
      )}
      <ListToolbar
        search={list.options.search!}
        status={list.options.status}
        statuses={["unused", "used"]}
        onSearch={(value) => list.update("search", value)}
        onStatus={(value) => list.update("status", value)}
        onRefresh={resource.reload}
      />
      <ResourceState {...resource} retry={resource.reload}>
        <DataTable
          columns={columns}
          rows={resource.data ?? []}
          getRowKey={(row) => row.code}
          total={resource.total}
          {...list.options}
          onPageChange={list.page}
        />
      </ResourceState>
      <Confirm
        open={!!target}
        title="Delete invitation?"
        message={`Permanently delete unused invitation ${target}? It will no longer allow registration.`}
        confirmLabel="Delete invitation"
        onCancel={() => setTarget(null)}
        onConfirm={async () => {
          if (!target) return;
          await deleteInviteCode(target);
          setCreated((previous) => previous.filter((code) => code !== target));
          setTarget(null);
          resource.reload();
        }}
      />
    </>
  );
}

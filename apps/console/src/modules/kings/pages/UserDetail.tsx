import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchUser, deleteUser } from "../api";
import { Confirm } from "../components/Confirm";
import { DataTable } from "../components/DataTable";
import { PageHeader, ResourceState, useResource } from "../components/Resource";
import { characterColumns } from "./Characters";
import { formatDateTime } from "../format";
export function UserDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const resource = useResource(() => fetchUser(id), [id]);
  const [confirm, setConfirm] = useState(false);
  const user = resource.data?.user;
  return (
    <>
      <Link className="back-link" to="/users">
        ← All players
      </Link>
      <ResourceState {...resource} retry={resource.reload}>
        {user && (
          <>
            <PageHeader
              title={user.display_name}
              description={`Account ${user.id}`}
              actions={
                <button className="admin-btn" onClick={resource.reload}>
                  Refresh
                </button>
              }
            />
            <dl className="detail-grid">
              <div>
                <dt>Sign-in method</dt>
                <dd>{user.oauth_provider}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{formatDateTime(user.created_at)}</dd>
              </div>
              <div>
                <dt>Last seen</dt>
                <dd>{formatDateTime(user.last_login)}</dd>
              </div>
              <div>
                <dt>Characters</dt>
                <dd>{resource.data?.characters.length}</dd>
              </div>
            </dl>
            <div className="section-heading">
              <h2>Characters</h2>
            </div>
            <DataTable
              columns={characterColumns.filter(
                (column) => column.key !== "user_name",
              )}
              rows={resource.data?.characters ?? []}
              getRowKey={(row) => row.id}
              linkTo={(row) => `/characters/${row.id}`}
            />
            <section className="danger-zone">
              <div>
                <h2>Delete account</h2>
                <p>
                  Permanently removes the account, characters, decks, and
                  progression. Accounts with active slots must be resolved
                  first.
                </p>
              </div>
              <button
                className="admin-btn admin-btn-danger"
                onClick={() => setConfirm(true)}
              >
                Delete account
              </button>
            </section>
            <Confirm
              open={confirm}
              title={`Delete ${user.display_name}?`}
              message="This permanently deletes the account and all character and progression data. Campaign history is retained without the account reference. This cannot be undone."
              confirmLabel="Delete account"
              onCancel={() => setConfirm(false)}
              onConfirm={async () => {
                await deleteUser(user.id);
                navigate("/users");
              }}
            />
          </>
        )}
      </ResourceState>
    </>
  );
}

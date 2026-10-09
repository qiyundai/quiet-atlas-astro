import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchCharacter, reviveCharacter } from "../api";
import { Confirm } from "../components/Confirm";
import { DataTable } from "../components/DataTable";
import {
  PageHeader,
  ResourceState,
  useResource,
  Badge,
} from "../components/Resource";
import { formatDateTime } from "../format";
export function CharacterDetail() {
  const { id = "" } = useParams();
  const resource = useResource(() => fetchCharacter(id), [id]);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const data = resource.data;
  const decks = new Map<string, { name: string; cards: string[] }>();
  data?.decks.forEach((deck) => {
    if (!decks.has(deck.id)) decks.set(deck.id, { name: deck.name, cards: [] });
    if (deck.pool_card_id)
      decks
        .get(deck.id)!
        .cards.push(
          data.cardPool.find((card) => card.id === deck.pool_card_id)
            ?.card_name ?? deck.pool_card_id,
        );
  });
  return (
    <>
      <Link className="back-link" to="/characters">
        ← All characters
      </Link>
      {notice && (
        <p role="status" className="success-note">
          {notice}
        </p>
      )}
      <ResourceState {...resource} retry={resource.reload}>
        {data && (
          <>
            <PageHeader
              title={data.character.name}
              description={`${data.character.class} · ${data.character.mode} · ${data.character.id}`}
              actions={
                <>
                  <Badge value={data.character.is_alive ? "alive" : "fallen"} />
                  {!data.character.is_alive && (
                    <button
                      className="admin-btn admin-btn-primary"
                      onClick={() => setConfirm(true)}
                    >
                      Revive character
                    </button>
                  )}
                  <button className="admin-btn" onClick={resource.reload}>
                    Refresh
                  </button>
                </>
              }
            />
            <dl className="detail-grid">
              <div>
                <dt>Player</dt>
                <dd>
                  <Link
                    className="text-link"
                    to={`/users/${data.character.user_id}`}
                  >
                    {data.character.user_name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Campaigns played</dt>
                <dd>{data.character.campaign_count}</dd>
              </div>
              <div>
                <dt>Wins / Losses</dt>
                <dd>
                  {data.character.wins} / {data.character.losses}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(data.character.created_at)}</dd>
              </div>
            </dl>
            <div className="section-heading">
              <h2>
                Card collection{" "}
                <span className="muted">({data.cardPool.length})</span>
              </h2>
            </div>
            <section className="admin-surface card-collection">
              {data.cardPool.length ? (
                data.cardPool.map((card) => (
                  <span
                    key={card.id}
                    className="card-chip"
                    title={`Acquired ${formatDateTime(card.acquired_at)}`}
                  >
                    {card.card_name}
                  </span>
                ))
              ) : (
                <p className="muted">No cards retained yet.</p>
              )}
            </section>
            <div className="section-heading mt-8">
              <h2>
                Saved decks <span className="muted">({decks.size})</span>
              </h2>
            </div>
            <div className="deck-grid">
              {decks.size ? (
                [...decks].map(([id, deck]) => (
                  <section className="admin-surface deck-card" key={id}>
                    <h3>{deck.name}</h3>
                    <p className="muted">{deck.cards.length} cards</p>
                    <ul>
                      {deck.cards.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </section>
                ))
              ) : (
                <div className="admin-surface empty-state">No saved decks.</div>
              )}
            </div>
            <div className="section-heading mt-8">
              <h2>Campaign history</h2>
            </div>
            <DataTable
              rows={data.campaigns}
              getRowKey={(row) => row.campaign_id}
              linkTo={(row) => `/campaigns/${row.campaign_id}`}
              columns={[
                {
                  key: "campaign_id",
                  label: "Campaign",
                  render: (row) => <code>{row.campaign_id}</code>,
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => <Badge value={row.status} />,
                },
                { key: "result", label: "Result" },
                { key: "stage", label: "Stage" },
                {
                  key: "survived",
                  label: "Survived",
                  render: (row) =>
                    row.survived === null
                      ? "Pending"
                      : row.survived
                        ? "Yes"
                        : "No",
                },
                {
                  key: "joined_at",
                  label: "Joined",
                  render: (row) => formatDateTime(row.joined_at),
                },
              ]}
            />
            <Confirm
              open={confirm}
              title={`Revive ${data.character.name}?`}
              message="Restore this character’s persistent alive status as compensation. This does not revive a player inside an ongoing campaign."
              confirmLabel="Revive character"
              variant="primary"
              onCancel={() => setConfirm(false)}
              onConfirm={async () => {
                await reviveCharacter(id);
                setConfirm(false);
                setNotice("Character revived.");
                resource.reload();
              }}
            />
          </>
        )}
      </ResourceState>
    </>
  );
}

import type { Provenance } from "@/lib/ai/service";
import { clock, player, type MatchEvent } from "@/lib/match";
import type { Insight } from "@/lib/intelligence";
export const providerLabel = (value: string) =>
  value === "openai"
    ? "OpenAI"
    : value === "foundry"
      ? "Microsoft Foundry"
      : "Deterministic offline";
export function ProvenanceDetails({
  provenance,
  events,
  insights,
}: {
  provenance: Provenance;
  events: MatchEvent[];
  insights: Insight[];
}) {
  const ids = new Set(provenance.facts.flatMap((f) => f.evidenceIds));
  const evidence = events.filter(
    (e) => ids.has(e.id) && e.time <= provenance.cutoff,
  );
  return (
    <details className="provenance">
      <summary>How Second Look knows</summary>
      <div
        className="provenance-content"
        tabIndex={0}
        aria-label="Explanation evidence and limitations"
      >
        <strong>
          {providerLabel(provenance.provider)}
          {provenance.model ? ` · ${provenance.model}` : ""}
        </strong>
        <p>
          Through {clock(provenance.cutoff)}
          {provenance.cached ? " · Reused a validated response" : ""}.{" "}
          {provenance.provider !== "offline"
            ? "AI chose supporting observations; Second Look supplied required match context."
            : "Computed directly from recorded events."}
        </p>
        <h4>Detected observations</h4>
        {provenance.facts.map((f) => (
          <p key={f.id}>{f.text}</p>
        ))}
        {!!insights.length && (
          <>
            <h4>Statistical comparisons</h4>
            {insights.map((i) => (
              <p key={i.id}>
                {i.metric}: {i.current} vs {i.previous}. Windows{" "}
                {clock(i.start)}–{clock(i.end)} and {clock(i.start - 900)}–
                {clock(i.start)}.
              </p>
            ))}
          </>
        )}
        <h4>Supporting events · {evidence.length}</h4>
        <ul
          className="provenance-events"
          tabIndex={0}
          aria-label="Supporting recorded events"
        >
          {evidence.map((e) => (
            <li key={e.id}>
              {clock(e.time)} · {player(e.playerId).name} · {e.type}{" "}
              <small>{e.id}</small>
            </li>
          ))}
        </ul>
        {!evidence.length && (
          <p>
            No supporting event is claimed for an absence of a pattern or a
            scoreless opening.
          </p>
        )}
        <h4>Evidence validation</h4>
        <ul>
          {provenance.validation.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
        <h4>Tool activity</h4>
        {provenance.activity.length ? (
          <ul>
            {provenance.activity.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        ) : (
          <p>No completed AI tool activity is recorded for this explanation.</p>
        )}
        <h4>Known limitations</h4>
        <ul>
          {provenance.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}

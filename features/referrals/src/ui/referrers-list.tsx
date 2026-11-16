import type { NavigationItem } from "@frostbite/plugin-kit/navigation";
import {
  referrerFilters,
  referrerSorts,
  type ReferrerFilter,
  type ReferrersPage,
  type ReferrerSort,
} from "@frostbite/referrals";
import {
  referralsAdminReferrerHref,
  referralsAdminReferrersPath,
} from "@frostbite/shared/referrals";
import {
  ArcadeBadge,
  ArcadeEmptyState,
  ConsoleCard,
  ConsoleRow,
} from "@repo/ui/arcade";

import { referrersWords } from "../domain/admin-copy.ts";
import { unitsLabel, whenLabel } from "../domain/format.ts";
import { AdminFrame } from "./frames.tsx";

export interface ReferrersView {
  readonly assetKey: string | null;
  readonly filter: ReferrerFilter;
  readonly page: number;
  readonly sort: ReferrerSort;
}

// The address of a view of the list: only what differs from the plain list is written, so the plain list has one address.
export function referrersHref(view: ReferrersView): string {
  const query = new URLSearchParams();
  if (view.filter !== "all") query.set("filter", view.filter);
  if (view.sort !== "pot") query.set("sort", view.sort);
  if (view.page > 1) query.set("page", String(view.page));
  const text = query.toString();
  return text === ""
    ? referralsAdminReferrersPath
    : `${referralsAdminReferrersPath}?${text}`;
}

function Choices<Value extends string>({
  current,
  label,
  options,
  words,
  write,
}: {
  readonly current: Value;
  readonly label: string;
  readonly options: readonly Value[];
  readonly words: Readonly<Record<Value, string>>;
  readonly write: (value: Value) => ReferrersView;
}) {
  return (
    <nav aria-label={label} className="ref-sections">
      {options.map((value) => (
        <a
          aria-current={value === current ? "true" : undefined}
          className="ref-sections__link"
          href={referrersHref(write(value))}
          key={value}
        >
          {words[value]}
        </a>
      ))}
    </nav>
  );
}

// `/admin/referrals/referrers`: who brought people and how each stands, filtered and sorted by the address (so a view can be linked), a
// page at a time. The pot is in one asset (the largest), because a list that added different assets would add what cannot be added.
export function ReferrersList({
  list,
  navigation,
  view,
}: {
  readonly list: ReferrersPage;
  readonly navigation: readonly NavigationItem[];
  readonly view: ReferrersView;
}) {
  const withView = (change: Partial<ReferrersView>): ReferrersView => ({
    ...view,
    page: 1,
    ...change,
  });
  return (
    <AdminFrame current="referrers" navigation={navigation}>
      <ConsoleCard glyph="☰" title="Referrers" wide>
        <Choices
          current={view.filter}
          label="Show"
          options={referrerFilters}
          words={referrersWords.filters}
          write={(filter) => withView({ filter })}
        />
        <Choices
          current={view.sort}
          label="Sort by"
          options={referrerSorts}
          words={referrersWords.sorts}
          write={(sort) => withView({ sort })}
        />
        {list.rows.length === 0 ? (
          <ArcadeEmptyState title="No referrers">
            {view.filter === "all" && view.page === 1
              ? referrersWords.empty
              : referrersWords.noMatch}
          </ArcadeEmptyState>
        ) : (
          <ul className="console-list">
            {list.rows.map((row) => (
              <ConsoleRow
                action={
                  row.frozen ? (
                    <ArcadeBadge tone="red">Paused</ArcadeBadge>
                  ) : null
                }
                detail={`${String(row.referred)} brought · ${unitsLabel(row.unpaid)} waiting · ${unitsLabel(row.paid)} paid · ${row.lastEarnedAt === null ? "no earning yet" : `last earned ${whenLabel(row.lastEarnedAt)}`}`}
                key={row.referrerId}
                name={
                  <a href={referralsAdminReferrerHref(row.referrerId)}>
                    {row.name}
                  </a>
                }
              />
            ))}
          </ul>
        )}
        <div className="ref-pager">
          {view.page > 1 ? (
            <a
              href={referrersHref({ ...view, page: view.page - 1 })}
              rel="prev"
            >
              Newer
            </a>
          ) : null}
          {list.hasMore ? (
            <a
              href={referrersHref({ ...view, page: view.page + 1 })}
              rel="next"
            >
              More
            </a>
          ) : null}
        </div>
      </ConsoleCard>
    </AdminFrame>
  );
}

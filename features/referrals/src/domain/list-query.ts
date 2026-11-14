import {
  referrerFilters,
  referrerSorts,
  type ReferrerFilter,
  type ReferrersQuery,
  type ReferrerSort,
} from "@frostbite/referrals";

type Search = Readonly<Record<string, string | readonly string[] | undefined>>;

// A parameter of the address as one text: the first, if it was given more than once.
const first = (
  search: Search | undefined,
  name: string,
): string | undefined => {
  const value = search?.[name];
  return typeof value === "string" ? value : value?.[0];
};

const choice = <Value extends string>(
  value: string | undefined,
  allowed: readonly Value[],
  otherwise: Value,
): Value => allowed.find((option) => option === value) ?? otherwise;

export const referrersPageSize = 25;
const mostPages = 10_000;

// What a view of the list of referrers is, read from the address: a word that is not one of the choices, or a page that is not a number
// from 1, is the plain list, never an error (an address is something a person may have edited).
export function listViewFrom(search: Search | undefined): {
  readonly filter: ReferrerFilter;
  readonly page: number;
  readonly sort: ReferrerSort;
} {
  const page = Number(first(search, "page"));
  return {
    filter: choice(first(search, "filter"), referrerFilters, "all"),
    page: Number.isInteger(page) && page >= 1 && page <= mostPages ? page : 1,
    sort: choice(first(search, "sort"), referrerSorts, "pot"),
  };
}

export const queryOf = (
  view: ReturnType<typeof listViewFrom>,
  assetKey: string | null,
): ReferrersQuery => ({ ...view, assetKey, pageSize: referrersPageSize });

// The cursor of the next page of earnings, as given in the address; none if it is not one text.
export const afterFrom = (search: Search | undefined): string | null =>
  first(search, "after") ?? null;

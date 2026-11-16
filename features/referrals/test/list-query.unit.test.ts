import { describe, expect, it } from "vitest";

import {
  afterFrom,
  listViewFrom,
  queryOf,
  referrersPageSize,
} from "../src/domain/list-query.ts";

describe("a view of the list of referrers, read from the address", () => {
  it("is the plain list when nothing is given", () => {
    expect(listViewFrom(undefined)).toEqual({
      filter: "all",
      page: 1,
      sort: "pot",
    });
    expect(listViewFrom({})).toEqual({ filter: "all", page: 1, sort: "pot" });
  });

  it("takes a filter, a sort and a page that are what they say, from the first of a repeated parameter", () => {
    expect(
      listViewFrom({ filter: "frozen", page: "3", sort: "recent" }),
    ).toEqual({ filter: "frozen", page: 3, sort: "recent" });
    expect(listViewFrom({ filter: ["waiting", "frozen"] }).filter).toBe(
      "waiting",
    );
  });

  it("falls back to the plain list for anything an edited address might say, and never throws", () => {
    for (const search of [
      { filter: "everyone", page: "0", sort: "random" },
      { page: "-2" },
      { page: "1.5" },
      { page: "abc" },
      { page: "10001" },
      { page: [] },
    ])
      expect(listViewFrom(search)).toEqual({
        filter: "all",
        page: 1,
        sort: "pot",
      });
  });

  it("becomes a query for the list with the page size and the asset chosen", () => {
    expect(queryOf({ filter: "all", page: 2, sort: "pot" }, "a/b/c")).toEqual({
      assetKey: "a/b/c",
      filter: "all",
      page: 2,
      pageSize: referrersPageSize,
      sort: "pot",
    });
  });

  it("reads the cursor of the next page of earnings, if there is one", () => {
    expect(afterFrom({ after: "abc|def" })).toBe("abc|def");
    expect(afterFrom({})).toBeNull();
    expect(afterFrom(undefined)).toBeNull();
  });
});

import { describe, expect, it, vi } from "vitest";

import { decideIngest } from "../src/server/telemetry/ingest-proxy";

const request = (
  pathname: string,
  search = "",
  headers: Record<string, string> = {},
) => ({
  headers: new Headers(headers),
  pathname,
  search,
});
const origin = "https://eu.i.example.com";
const eventsOrigin = "https://events.example.com";
// The platform's two services, each with its own path, as the proxy gives them.
const routes = (
  errors: () => string | null,
  events: () => string | null = () => eventsOrigin,
) => [
  { origin: errors, path: "/telemetry/errors" },
  { origin: events, path: "/telemetry/events" },
];

describe("what the proxy does with a page's error report", () => {
  it("leaves every other request alone, without reading the settings", () => {
    const settings = vi.fn(() => origin);
    for (const path of [
      "/",
      "/games",
      "/telemetry",
      "/telemetry/errors-other",
      "/telemetry/events-other",
      "/api/v1/games",
    ])
      expect(decideIngest(request(path), routes(settings, settings))).toEqual({
        kind: "not-ingest",
      });
    expect(settings).not.toHaveBeenCalled();
  });

  it("sends a report on to the provider's address with the path and query it was given, trailing slash and all", () => {
    for (const [path, search, target] of [
      ["/telemetry/errors/e/", "", "https://eu.i.example.com/e/"],
      ["/telemetry/errors/e", "", "https://eu.i.example.com/e"],
      [
        "/telemetry/errors/i/v0/e/",
        "?ip=0&_=1",
        "https://eu.i.example.com/i/v0/e/?ip=0&_=1",
      ],
    ] as const) {
      const decision = decideIngest(
        request(path, search),
        routes(() => origin),
      );
      expect(decision.kind).toBe("forward");
      expect(decision.kind === "forward" && decision.target.href).toBe(target);
    }
  });

  it("holds back everything that says who the person is or where they were: the session cookie, any login, their address and the page they came from", () => {
    const decision = decideIngest(
      request("/telemetry/errors/e/", "", {
        authorization: "Bearer abc",
        "content-encoding": "gzip",
        "content-type": "text/plain",
        cookie: "frostbite_session=SECRET",
        forwarded: "for=203.0.113.9",
        origin: "https://platform.example",
        referer: "https://platform.example/s/123?code=SECRET",
        "user-agent": "Mozilla/5.0",
        "x-forwarded-for": "203.0.113.9",
        "x-forwarded-host": "platform.example",
        "x-forwarded-proto": "https",
        "x-real-ip": "203.0.113.9",
      }),
      routes(() => origin),
    );
    if (decision.kind !== "forward") throw new Error("expected a forward");
    expect([...decision.headers.keys()].sort()).toEqual([
      "content-encoding",
      "content-type",
      "user-agent",
    ]);
  });

  it("answers with nothing when there is no provider to send to", () => {
    expect(
      decideIngest(
        request("/telemetry/errors/e/"),
        routes(() => null),
      ),
    ).toEqual({
      kind: "drop",
    });
  });

  it("does not touch the headers of the request it was given", () => {
    const given = request("/telemetry/errors/e/", "", { cookie: "a=b" });
    decideIngest(
      given,
      routes(() => origin),
    );
    expect(given.headers.get("cookie")).toBe("a=b");
  });
});

describe("the two services' paths", () => {
  it("send an analytics event to the analytics address, and a report to the error address, each by its own settings", () => {
    const event = decideIngest(
      request("/telemetry/events/e/", "?ip=0"),
      routes(() => origin),
    );
    expect(event.kind === "forward" && event.target.href).toBe(
      "https://events.example.com/e/?ip=0",
    );
    const report = decideIngest(
      request("/telemetry/errors/e/"),
      routes(() => origin),
    );
    expect(report.kind === "forward" && report.target.href).toBe(
      "https://eu.i.example.com/e/",
    );
  });

  it("answer an event with nothing when analytics has no provider, while errors still go on, and the other way round", () => {
    expect(
      decideIngest(
        request("/telemetry/events/e/"),
        routes(
          () => origin,
          () => null,
        ),
      ).kind,
    ).toBe("drop");
    expect(
      decideIngest(
        request("/telemetry/errors/e/"),
        routes(
          () => origin,
          () => null,
        ),
      ).kind,
    ).toBe("forward");
    expect(
      decideIngest(
        request("/telemetry/events/e/"),
        routes(() => null),
      ).kind,
    ).toBe("forward");
  });

  it("do not read the other service's settings", () => {
    const errors = vi.fn(() => origin);
    decideIngest(request("/telemetry/events/e/"), routes(errors));
    expect(errors).not.toHaveBeenCalled();
  });

  it("hold back the same headers for an event as for a report", () => {
    const decision = decideIngest(
      request("/telemetry/events/e/", "", {
        cookie: "frostbite_session=SECRET",
        referer: "https://platform.example/s/123",
        "x-forwarded-for": "203.0.113.9",
      }),
      routes(() => origin),
    );
    if (decision.kind !== "forward") throw new Error("expected a forward");
    expect([...decision.headers.keys()]).toEqual([]);
  });
});

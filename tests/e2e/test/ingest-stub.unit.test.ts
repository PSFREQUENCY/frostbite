import { request } from "node:http";
import { gzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import startAnalyticsStub from "../src/analytics-stub-setup.ts";
import {
  analyticsStubPort,
  errorReportingStubPort,
  startIngestStub,
} from "../src/ingest-stub.ts";

function post(
  port: number,
  path: string,
  body: Buffer,
  headers: Record<string, string> = {},
): Promise<{ readonly body: string; readonly status: number }> {
  return new Promise((resolve, reject) => {
    const call = request(
      { headers, host: "127.0.0.1", method: "POST", path, port },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            status: response.statusCode ?? 0,
          }),
        );
      },
    );
    call.on("error", reject);
    call.end(body);
  });
}

describe("the stand-in for a provider's ingest address", () => {
  it("answers every request with success and keeps what it was sent, plain or compressed, with its headers and address", async () => {
    const stub = await startIngestStub(0);
    try {
      expect(stub.port).toBeGreaterThan(0);
      const plain = await post(stub.port, "/e/?ip=0", Buffer.from('{"a":1}'), {
        cookie: "x=1",
      });
      const zipped = await post(
        stub.port,
        "/i/v0/e/",
        gzipSync(Buffer.from('{"batch":[]}')),
      );
      expect([plain.status, zipped.status]).toEqual([200, 200]);
      expect(plain.body).toBe('{"status":1}');
      expect(stub.received.map(({ body, url }) => [url, body])).toEqual([
        ["/e/?ip=0", '{"a":1}'],
        ["/i/v0/e/", '{"batch":[]}'],
      ]);
      expect(stub.received[0]?.headers.cookie).toBe("x=1");
    } finally {
      await stub.close();
    }
  });

  it("is let go of when closed, so the port can be used again", async () => {
    const first = await startIngestStub(0);
    await first.close();
    const second = await startIngestStub(first.port);
    expect(second.port).toBe(first.port);
    await second.close();
  });

  it("gives each service its own address", () => {
    expect(analyticsStubPort).not.toBe(errorReportingStubPort);
  });
});

describe("the analytics stand-in that runs for a whole browser run", () => {
  it("starts on the analytics address and hands back how to stop it", async () => {
    const stop = await startAnalyticsStub();
    const answer = await post(analyticsStubPort, "/e/", Buffer.from("{}"));
    expect(answer.status).toBe(200);
    await stop();
    await expect(
      post(analyticsStubPort, "/e/", Buffer.from("{}")),
    ).rejects.toThrow();
  });
});

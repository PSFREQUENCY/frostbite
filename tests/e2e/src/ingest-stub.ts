import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import { gunzipSync } from "node:zlib";

// Stands in for a provider in the browser tests: the platform forwards a page's reports or events here (the test web server is started with
// `ERROR_REPORTING_INGEST_ORIGIN` and `ANALYTICS_INGEST_ORIGIN` set to these origins) and a test can read what arrived. Each service has its
// own address, as it has its own provider. Nothing leaves the machine.
export const errorReportingStubPort = 4399;
export const errorReportingStubOrigin = `http://127.0.0.1:${String(errorReportingStubPort)}`;
export const analyticsStubPort = 4398;
export const analyticsStubOrigin = `http://127.0.0.1:${String(analyticsStubPort)}`;

export interface ReceivedReport {
  readonly body: string;
  readonly headers: IncomingHttpHeaders;
  readonly url: string;
}

export interface IngestStub {
  readonly close: () => Promise<void>;
  readonly received: ReceivedReport[];
}

export async function startIngestStub(port: number): Promise<IngestStub> {
  const received: ReceivedReport[] = [];
  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const raw = Buffer.concat(chunks);
      received.push({
        body: (raw[0] === 0x1f ? gunzipSync(raw) : raw).toString("utf8"),
        headers: request.headers,
        url: request.url ?? "",
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"status":1}');
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve),
  );
  return {
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
    received,
  };
}

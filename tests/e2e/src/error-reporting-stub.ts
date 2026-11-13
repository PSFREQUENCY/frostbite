import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import { gunzipSync } from "node:zlib";

// Stands in for the error provider in the browser tests: the platform forwards a page's error reports here (the test web server is started
// with `ERROR_REPORTING_INGEST_ORIGIN` set to `errorReportingStubOrigin`) and the test reads what arrived. Nothing leaves the machine.
export const errorReportingStubPort = 4399;
export const errorReportingStubOrigin = `http://127.0.0.1:${String(errorReportingStubPort)}`;

export interface ReceivedReport {
  readonly body: string;
  readonly headers: IncomingHttpHeaders;
  readonly url: string;
}

export interface ErrorReportingStub {
  readonly close: () => Promise<void>;
  readonly received: ReceivedReport[];
}

export async function startErrorReportingStub(): Promise<ErrorReportingStub> {
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
    server.listen(errorReportingStubPort, "127.0.0.1", resolve),
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

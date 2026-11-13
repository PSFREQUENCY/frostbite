// How a PostHog client in a page is brought in without the page waiting for it: the library loads once the page is idle, what is asked of
// it before it is ready waits (a few things, no more), and if it cannot load, what waits is dropped and later asks are ignored. A report or
// an event is never worth a visible failure, so nothing here throws or rejects to the caller.

// How many asks wait for the library to load; more than this and the later ones are not worth the memory.
const maxWaiting = 20;

export interface LazyDeps<Library> {
  // Brings the library in; the page does not wait for it.
  readonly load: () => Promise<Library>;
  // Runs a function once the page has nothing better to do.
  readonly whenIdle: (run: () => void) => void;
}

// Starts bringing the library in and returns how to use it: `use` runs now when it is ready, later when it becomes ready, and never when it
// could not load. `start` makes the client from the loaded library (it is where the provider's settings are given).
export function lazyClient<Library, Client>(
  deps: LazyDeps<Library>,
  start: (library: Library) => Client,
): (use: (client: Client) => void) => void {
  const waiting: ((client: Client) => void)[] = [];
  let client: Client | null = null;
  let broken = false;
  deps.whenIdle(() => {
    deps
      .load()
      .then((loaded) => {
        const started = start(loaded);
        client = started;
        for (const use of waiting.splice(0)) use(started);
      })
      .catch(() => {
        broken = true;
        waiting.length = 0;
      });
  });
  return (use) => {
    if (broken) return;
    if (client !== null) use(client);
    else if (waiting.length < maxWaiting) waiting.push(use);
  };
}

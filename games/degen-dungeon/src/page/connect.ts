import {
  GameHostError,
  type createGameClient,
} from "@frostbite/game-sdk/client";
import { connectToPlatform, type PlatformPlay } from "@frostbite/game-sdk/play";

import { freshProgress, restore, type Progress } from "../progress.ts";

// Joining the platform: the saved progress, the platform's play (runs and milestones), the milestones' titles and those already unlocked,
// and a line for the status that says how it went. A failure anywhere leaves a fresh save and no platform, and the game still plays.
export interface Joined {
  // The badges already unlocked on the platform.
  readonly collected: ReadonlySet<string>;
  readonly play: PlatformPlay | null;
  readonly progress: Progress;
  readonly status: string;
  readonly titles: Map<string, string>;
}

export async function join(
  client: ReturnType<typeof createGameClient>,
  drawn: boolean,
): Promise<Joined> {
  let progress = freshProgress;
  try {
    await client.ready();
    progress = restore(await client.progress.load());
    const play = await connectToPlatform(client);
    const listed = await client.milestones.list().catch(() => []);
    const titles = new Map(listed.map(({ id, title }) => [id, title]));
    const collected = new Set(
      listed.flatMap(({ id, status }) => (status === "unlocked" ? [id] : [])),
    );
    const status = drawn
      ? "Connected."
      : "Connected. No 3D here, so the island is drawn flat.";
    return { collected, play, progress, status, titles };
  } catch (error) {
    const status =
      error instanceof GameHostError
        ? `The platform said: ${error.code}`
        : "Could not connect to the platform. You can still play.";
    return {
      collected: new Set(),
      play: null,
      progress,
      status,
      titles: new Map(),
    };
  }
}

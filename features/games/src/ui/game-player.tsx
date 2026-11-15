"use client";

import type {
  ClaimsService,
  HostedGame,
  RunsService,
} from "@frostbite/game-sdk/host";
import type { WalletInfo } from "@frostbite/game-sdk/protocol";
import type { WalletNetwork } from "@frostbite/wallet/contracts";
import type { GameMilestone } from "@frostbite/shared/games";
import type {
  AccountPort,
  SyncStatus,
} from "@frostbite/game-sdk/synced-backend";
import {
  ArcadeActionButton,
  ArcadeDock,
  ArcadeStage,
  type DockSection,
} from "@repo/ui/arcade";
import { useAnalytics } from "@frostbite/client-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { ClaimsApi } from "../client/claims-api.ts";
import { ClaimDialog } from "./claim-dialog.tsx";
import type { ClaimFeeSettings } from "../wallet-config.ts";
import type { ClaimSigner } from "./use-claims.ts";
import { usePlayerClaims } from "./use-player-claims.ts";
import { GameBar } from "./game-bar.tsx";
import { gameDock } from "./game-dock.tsx";
import { ScoreShare } from "./score-share.tsx";
import type { SharesApi } from "../client/shares-api.ts";
import type { ShareConfig } from "@frostbite/share";
import { useFullscreen } from "./use-fullscreen.ts";
import { MilestoneToast } from "./milestone-toast.tsx";
import { useImmersive } from "./use-immersive.ts";
import { touchScreenQuery, useMediaQuery } from "./use-media-query.ts";
import { useTheatre } from "./use-theatre.ts";
import { usePhoneLandscape } from "./use-phone-landscape.ts";
import { useGameSession } from "./use-game-session.ts";

// What the frame may do. Scripts only: no same-origin access, so the game has no storage, cookies or session
// of the platform, no forms, no popups, no top navigation. The response headers for the game's files repeat
// this as a sandbox of their own, so it holds even if the files are opened outside this frame.
export const gameFrameSandbox = "allow-scripts";
export const gameFramePermissions = "fullscreen; autoplay; gamepad";

// Where the progress is, said only as far as it is true.
const blockedCopy: Record<SyncStatus, string> = {
  account:
    "This browser is blocking storage, so your progress is kept only on your account.",
  local:
    "This browser is blocking storage, so progress will be lost when you leave.",
  pending:
    "This browser is blocking storage and your account could not be reached, so progress will be lost when you leave.",
};

const keptCopy: Record<SyncStatus, string> = {
  account: "Your progress is saved to your account and kept in this browser.",
  local: "Your progress is kept in this browser only.",
  pending:
    "Your progress is kept in this browser. Saving it to your account is waiting for a connection.",
};

export { milestoneCopy } from "./milestones-section.tsx";

export function GamePlayer({
  accountFor,
  back,
  claims,
  claimsFor,
  game,
  gallery,
  lead = [],
  meta,
  runsFor,
  sections = [],
  share,
  sharesApi,
  src,
  title,
  wallet,
}: {
  // How the page reaches the account for a game; the real one unless a test supplies another.
  readonly accountFor?: (gameId: string) => AccountPort;
  // A way back to the list, first in the bar.
  readonly back?: ReactNode;
  // How the page asks the platform to start a claim, given a way to read the connected wallet; the real one unless a test
  // supplies another.
  readonly claimsFor?: (
    gameId: string,
    wallet: () => WalletInfo | null,
  ) => ClaimsService;
  // Present for a game whose milestones can be claimed on chain: how the page reaches the claim routes, the wallet the player
  // has connected (the page's own use of it: the game is not told), and how that wallet signs a claim, if it can.
  readonly claims?: {
    readonly api?: ClaimsApi;
    // How a claim's fee speed is offered; absent, no choice is made and claims use the platform's usual speed.
    readonly fees?: ClaimFeeSettings;
    readonly pollMs?: number;
    readonly sign?: ClaimSigner;
    readonly wallet: WalletInfo | null;
  };
  readonly game: HostedGame & { readonly milestones: readonly GameMilestone[] };
  // The game's public gallery of mints, for the Mints tab beside the player's own claims; absent where the game mints nothing.
  readonly gallery?: ReactNode;
  // Sections that come right after the milestones, where a phone's player reaches them first (the leaderboard).
  readonly lead?: readonly DockSection[];
  // Small facts beside the title in the bar (version, network).
  readonly meta?: ReactNode;
  // How the page reaches the platform to start and settle runs; the real one unless a test supplies another.
  readonly runsFor?: (gameId: string) => RunsService;
  // More sections for the dock under the stage, after the player's milestones, leaders and mints.
  readonly sections?: readonly DockSection[];
  // Where a link can be shared; without it nothing here can be. Sharing needs the player's account, so it is offered only to a signed-in
  // player whose progress is on it.
  readonly share?: ShareConfig;
  readonly sharesApi?: SharesApi;
  readonly src: string;
  readonly title: string;
  // Set only for a game that declared the wallet capability: what the player has connected, how to ask for the
  // wallet chooser, and the network the game expects. Without it the game is never told about a wallet and the
  // dock has no wallet section.
  readonly wallet?: {
    readonly connect: () => void;
    readonly current: WalletInfo | null;
    readonly expectedNetwork: WalletNetwork;
  };
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const analytics = useAnalytics();
  // A game's page was opened: counted once for each game the page shows.
  useEffect(() => {
    analytics.capture("game_opened", { game: game.id });
  }, [analytics, game.id]);
  const {
    claimsFor: claimsOf,
    bindTelling,
    titles,
    ui: claimUi,
  } = usePlayerClaims(game.milestones, game.id, claims, claimsFor);
  const {
    connected,
    emitClaim,
    kept,
    newBest,
    progress,
    sync,
    toast,
    unlocked,
  } = useGameSession(
    game,
    frame,
    src,
    accountFor,
    { connectWallet: wallet?.connect, title, wallet: wallet?.current },
    runsFor,
    claimsOf,
  );
  useEffect(() => {
    bindTelling(emitClaim);
  }, [bindTelling, emitClaim]);
  const fullscreen = useFullscreen(frame);
  const theatre = useTheatre();
  const immersive = useImmersive(fullscreen, theatre);
  // On a touch screen two buttons (theatre and full screen) become one that does both, and the bar gives way to a small exit chip.
  const touch = useMediaQuery(touchScreenQuery);
  const phoneLandscape = usePhoneLandscape();
  const [promptDismissed, setPromptDismissed] = useState(false);
  const prompt = phoneLandscape && !theatre.on && !promptDismissed;
  // Sharing makes a link from the player's account, so it is offered once their progress is on it.
  const canShare = share !== undefined && sync === "account";
  const dock = gameDock({
    claimUi,
    claims,
    gallery,
    game,
    lead,
    progress,
    sections,
    share: canShare ? { api: sharesApi, config: share } : undefined,
    title,
    titles,
    unlocked,
    wallet,
  });
  return (
    <>
      <ArcadeStage
        theatre={theatre.on}
        exit={
          touch ? (
            <ArcadeActionButton
              ariaLabel="Leave full screen"
              onClick={immersive.leave}
              size="small"
              tone="pink"
            >
              ✕
            </ArcadeActionButton>
          ) : undefined
        }
        bar={
          <GameBar
            back={back}
            connected={connected}
            fullscreen={fullscreen}
            {...(touch ? { immersive } : {})}
            meta={meta}
            saveText={kept ? keptCopy[sync] : blockedCopy[sync]}
            {...(canShare && newBest !== null
              ? {
                  share: (
                    <ScoreShare
                      api={sharesApi}
                      config={share}
                      gameId={game.id}
                      gameTitle={title}
                      score={newBest}
                    />
                  ),
                }
              : {})}
            theatre={theatre}
            title={title}
          />
        }
        overlay={
          <>
            {theatre.on ? <MilestoneToast text={toast} /> : null}
            {prompt ? (
              <div className="arcade-prompt" data-testid="fullscreen-prompt">
                <p>
                  Playing on a phone? Full screen gives the game every pixel.
                </p>
                <ArcadeActionButton
                  onClick={() => {
                    setPromptDismissed(true);
                    immersive.enter();
                  }}
                  tone="cyan"
                >
                  Play full screen
                </ArcadeActionButton>
                <ArcadeActionButton
                  onClick={() => setPromptDismissed(true)}
                  tone="pink"
                >
                  Not now
                </ArcadeActionButton>
              </div>
            ) : null}
          </>
        }
      >
        <iframe
          allow={gameFramePermissions}
          data-game-src={src}
          data-testid="game-frame"
          ref={frame}
          sandbox={gameFrameSandbox}
          style={{ border: 0 }}
          title={title}
        />
      </ArcadeStage>
      <ClaimDialog
        claim={claimUi.active}
        message={claimUi.message}
        onClose={claimUi.dismiss}
        onSign={() => void claimUi.sign()}
        preparing={claimUi.preparing !== null}
        refusal={claimUi.refusal?.text ?? null}
        signerNote={claimUi.signerNote}
        title={
          claimUi.active !== null
            ? (titles[claimUi.active.milestoneId] ?? claimUi.active.milestoneId)
            : (() => {
                const id = claimUi.preparing ?? claimUi.refusal?.milestoneId;
                return id === undefined ? "" : (titles[id] ?? id);
              })()
        }
        working={claimUi.working}
      />
      <ArcadeDock
        label="About this game"
        notice={theatre.on ? undefined : <MilestoneToast text={toast} />}
        sections={dock}
      />
    </>
  );
}

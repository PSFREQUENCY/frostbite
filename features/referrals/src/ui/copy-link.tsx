"use client";

import { ArcadeActionButton } from "@repo/ui/arcade";
import { useState, useSyncExternalStore } from "react";

import { mineWords } from "../domain/copy.ts";

// Nothing here changes while the page is open, so there is nothing to subscribe to.
const noSubscription = () => () => undefined;

// The referral link as text to read, with the two things people do with it: copy it, and (where the device offers it) hand it to the share
// sheet. The link is built from the page's own address, so it is right on every host. A device that cannot copy leaves the text to select.
export function CopyLink({ path }: { readonly path: string }) {
  const [copied, setCopied] = useState(false);
  // What the browser knows and the server cannot: the address the link is on, and whether the device has a share sheet. The server's page and
  // the browser's first render are the same (the path, no share button); the browser's own values follow at once.
  const full = useSyncExternalStore(
    noSubscription,
    () => new URL(path, window.location.origin).toString(),
    () => path,
  );
  const canShare = useSyncExternalStore(
    noSubscription,
    () => typeof navigator.share === "function",
    () => false,
  );
  const link = () => full;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  };
  const share = async () => {
    try {
      await navigator.share({ text: mineWords.shareText, url: link() });
    } catch {
      // The person closed the sheet: nothing to say.
    }
  };
  return (
    <div className="ref-link">
      <input
        aria-label={mineWords.linkLabel}
        className="ref-link__text"
        onFocus={(event) => event.currentTarget.select()}
        readOnly
        value={full}
      />
      <div className="ref-link__actions">
        <ArcadeActionButton onClick={() => void copy()} tone="mint">
          {copied ? mineWords.copied : mineWords.copy}
        </ArcadeActionButton>
        {canShare ? (
          <ArcadeActionButton onClick={() => void share()}>
            {mineWords.share}
          </ArcadeActionButton>
        ) : null}
      </div>
      <span aria-live="polite" className="ref-link__live">
        {copied ? mineWords.copied : ""}
      </span>
    </div>
  );
}

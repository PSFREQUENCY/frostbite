import { registerHttpOperation } from "@frostbite/http/registered-operation";
import type { FeatureEntrypoint } from "@frostbite/plugin-kit";
import {
  clipDescription,
  privatePage,
} from "@frostbite/plugin-kit/page-metadata";
import type { ReferralsConfig } from "@frostbite/referrals";
import {
  referralAdministerCapability,
  referralsAdminPath,
  referralsAdminProgramPath,
  referralsAdminReferrerPath,
  referralsAdminReferrersPath,
  referralsHistoryPath,
  referralsPath,
  referralViewCapability,
} from "@frostbite/shared/referrals";

import {
  createSetFrozenOperation,
  createSetProgramOperation,
} from "./application/operations.ts";
import { pageWords } from "./domain/copy.ts";
import { afterFrom, listViewFrom, queryOf } from "./domain/list-query.ts";
import { createReferralsResolver } from "./runtime.ts";
import { AdminOverview } from "./ui/admin-overview.tsx";
import { AdminProgram } from "./ui/admin-program.tsx";
import { HistoryPage } from "./ui/history-page.tsx";
import { ReferrerPage } from "./ui/referrer-page.tsx";
import { ReferrersList } from "./ui/referrers-list.tsx";
import { ReferralsPage } from "./ui/referrals-page.tsx";
import { NotFoundPage } from "./ui/not-found-page.tsx";

const viewAccess = {
  capability: referralViewCapability,
  kind: "platform",
} as const;
const adminAccess = {
  capability: referralAdministerCapability,
  kind: "platform",
} as const;

export function createReferralsEntrypoint(
  config: ReferralsConfig,
): FeatureEntrypoint {
  const resolve = createReferralsResolver(config);
  const ceilings = {
    maximumMaturitySeconds: config.policy.maximumMaturitySeconds,
    maximumMinimumPayoutUnits: config.policy.maximumMinimumPayout.toString(),
  };
  return {
    capabilities: [
      "api-routes",
      "authenticated-page",
      "navigation",
      "public-page",
      "studio-page",
    ],
    id: "referrals",
    operations: [
      registerHttpOperation(createSetProgramOperation(resolve)),
      registerHttpOperation(createSetFrozenOperation(resolve)),
    ],
    pages: [
      {
        access: { kind: "public" },
        actor: "optional",
        metadata: () => ({
          description: clipDescription(pageWords.explainerIntro),
          kind: "shared",
          title: pageWords.explainerHeading,
        }),
        path: referralsPath,
        render: async ({ actorUserId, navigation }) => {
          const reads = await resolve();
          const [program, mine] = await Promise.all([
            reads.program.current(),
            actorUserId === null ? null : reads.mine.summary(actorUserId),
          ]);
          return (
            <ReferralsPage
              mine={mine}
              navigation={navigation}
              program={program}
            />
          );
        },
      },
      {
        access: { kind: "authenticated" },
        metadata: () => privatePage,
        path: referralsHistoryPath,
        render: async ({ actorUserId, navigation, searchParams }) => {
          if (actorUserId === null)
            return <NotFoundPage navigation={navigation} />;
          const history = await (
            await resolve()
          ).mine.history(actorUserId, {
            after: afterFrom(searchParams),
          });
          return <HistoryPage history={history} navigation={navigation} />;
        },
      },
      {
        access: viewAccess,
        metadata: () => privatePage,
        path: referralsAdminPath,
        render: async ({ navigation }) => (
          <AdminOverview
            navigation={navigation}
            overview={await (await resolve()).admin.overview()}
          />
        ),
      },
      {
        access: adminAccess,
        metadata: () => privatePage,
        path: referralsAdminProgramPath,
        render: async ({ navigation }) => {
          const reads = await resolve();
          const [program, history] = await Promise.all([
            reads.program.current(),
            reads.program.history(),
          ]);
          const who = await reads.names(
            history.flatMap(({ changedBy }) => changedBy ?? []),
          );
          return (
            <AdminProgram
              ceilings={ceilings}
              history={history}
              navigation={navigation}
              program={program}
              who={who}
            />
          );
        },
      },
      {
        access: viewAccess,
        metadata: () => privatePage,
        path: referralsAdminReferrersPath,
        render: async ({ navigation, searchParams }) => {
          const reads = await resolve();
          const view = listViewFrom(searchParams);
          // The pot is shown in the asset with the most owed; with nothing owed there is no pot to show.
          const assetKey =
            (await reads.admin.overview()).assets[0]?.assetKey ?? null;
          const list = await reads.admin.referrers(queryOf(view, assetKey));
          return (
            <ReferrersList
              list={list}
              navigation={navigation}
              view={{ ...view, assetKey }}
            />
          );
        },
      },
      {
        access: viewAccess,
        metadata: () => privatePage,
        path: referralsAdminReferrerPath,
        render: async ({ navigation, params, searchParams }) => {
          const after = afterFrom(searchParams);
          const referrerId = params.referrerId ?? "";
          const detail = await (
            await resolve()
          ).admin.referrer(referrerId, { after });
          if (detail === null) return <NotFoundPage navigation={navigation} />;
          return (
            <ReferrerPage
              detail={detail}
              navigation={navigation}
              older={
                detail.earnings.next === null
                  ? null
                  : `${referralsAdminReferrersPath}/${referrerId}?after=${encodeURIComponent(detail.earnings.next)}`
              }
            />
          );
        },
      },
    ],
    version: "1.0.0",
  };
}

import type { NavigationItem } from "@frostbite/plugin-kit/navigation";
import type { ReferralProgram } from "@frostbite/referrals";
import {
  ArcadeBadge,
  ArcadeEmptyState,
  ConsoleCard,
  ConsoleRow,
  KeyValueList,
} from "@repo/ui/arcade";

import { programWords } from "../domain/admin-copy.ts";
import {
  percentLabel,
  unitsLabel,
  waitLabel,
  whenLabel,
} from "../domain/format.ts";
import { AdminFrame } from "./frames.tsx";
import { ProgramPanel } from "./program-panel.tsx";
import type { ReferralsApi } from "../client/api.ts";

export interface ProgramCeilings {
  readonly maximumMaturitySeconds: number;
  readonly maximumMinimumPayoutUnits: string;
}

const formValues = (program: ReferralProgram | null) => ({
  enabled: program?.enabled ?? false,
  maturitySeconds: String(program?.maturitySeconds ?? 0),
  minimumPayoutUnits: String(program?.minimumPayout ?? 0n),
  rateBasisPoints: String(program?.rateBasisPoints ?? 300),
});

// `/admin/referrals/program` (administrators only): what the program is set to now, the form that changes it, and the log of who changed
// what. The public page reads the same record, so a saved change is what visitors are told from the next look.
export function AdminProgram({
  api,
  ceilings,
  history,
  navigation,
  program,
  who,
}: {
  readonly api?: ReferralsApi | undefined;
  readonly ceilings: ProgramCeilings;
  readonly history: readonly ReferralProgram[];
  readonly navigation: readonly NavigationItem[];
  readonly program: ReferralProgram | null;
  // Names for the accounts that changed it, by id.
  readonly who: ReadonlyMap<string, string>;
}) {
  return (
    <AdminFrame current="program" navigation={navigation}>
      <ConsoleCard glyph="⚙" title="Now">
        {program === null ? (
          <p>{programWords.notSet}</p>
        ) : (
          <KeyValueList
            items={[
              {
                label: "Earning",
                value: (
                  <ArcadeBadge tone={program.enabled ? "mint" : "red"}>
                    {program.enabled ? "On" : "Off"}
                  </ArcadeBadge>
                ),
              },
              {
                label: "Share of the fee",
                value: percentLabel(program.rateBasisPoints),
              },
              {
                label: "Minimum payout",
                value: unitsLabel(program.minimumPayout),
              },
              {
                label: "Wait before payable",
                value: waitLabel(program.maturitySeconds),
              },
              { label: "Set", value: whenLabel(program.changedAt) },
            ]}
            label="The program in force"
          />
        )}
      </ConsoleCard>
      <ConsoleCard glyph="✎" title="Change it" wide>
        <ProgramPanel
          api={api}
          initial={formValues(program)}
          maximumMaturitySeconds={ceilings.maximumMaturitySeconds}
          maximumMinimumPayoutUnits={ceilings.maximumMinimumPayoutUnits}
        />
      </ConsoleCard>
      <ConsoleCard glyph="☰" title={programWords.history} wide>
        {history.length === 0 ? (
          <ArcadeEmptyState title="No changes yet">
            {programWords.historyEmpty}
          </ArcadeEmptyState>
        ) : (
          <ul className="console-list">
            {history.map((setting) => (
              <ConsoleRow
                detail={`${whenLabel(setting.changedAt)} by ${setting.changedBy === null ? "an account that no longer exists" : (who.get(setting.changedBy) ?? "an account that no longer exists")}`}
                key={setting.id}
                name={`${setting.enabled ? "On" : "Off"}, ${percentLabel(setting.rateBasisPoints)}, minimum ${unitsLabel(setting.minimumPayout)}, wait ${waitLabel(setting.maturitySeconds)}`}
              />
            ))}
          </ul>
        )}
      </ConsoleCard>
    </AdminFrame>
  );
}

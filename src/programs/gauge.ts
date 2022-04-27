import type { Program } from "@project-serum/anchor";
import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { GaugeIDL } from "../idls/gauge";

export * from "../idls/gauge";

export type GaugeTypes = AnchorTypes<
  GaugeIDL,
  {
    gaugemeister: GaugemeisterData;
    gauge: GaugeData;
    gaugeVoter: GaugeVoterData;
    gaugeVote: GaugeVoteData;
    epochGauge: EpochGaugeData;
    epochGaugeVoter: EpochGaugeVoterData;
    epochGaugeVote: EpochGaugeVoteData;
  }
>;

type Accounts = GaugeTypes["Accounts"];

export type GaugemeisterData = Accounts["gaugemeister"];
export type GaugeData = Accounts["gauge"];
export type GaugeVoterData = Accounts["gaugeVoter"];
export type GaugeVoteData = Accounts["gaugeVote"];
export type EpochGaugeData = Accounts["epochGauge"];
export type EpochGaugeVoterData = Accounts["epochGaugeVoter"];
export type EpochGaugeVoteData = Accounts["epochGaugeVote"];

export type GaugeProgram = Program<GaugeIDL>;

import * as anchor from "@project-serum/anchor";
import { makeSaberProvider } from "@saberhq/anchor-contrib";

import type { GaugePrograms } from "../../src";
import { GaugeSDK } from "../../src";

export type Workspace = GaugePrograms;

export const makeSDK = (): GaugeSDK => {
  const anchorProvider = anchor.AnchorProvider.env();
  anchor.setProvider(anchorProvider);
  const provider = makeSaberProvider(anchorProvider);
  return GaugeSDK.load({
    provider,
  });
};

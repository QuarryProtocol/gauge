import * as anchor from "@project-serum/anchor";
import { makeSaberProvider } from "@saberhq/anchor-contrib";
import { chaiSolana } from "@saberhq/chai-solana";
import chai from "chai";

import type { GaugePrograms } from "../../src";
import { GaugeSDK } from "../../src";

chai.use(chaiSolana);

export type Workspace = GaugePrograms;

export const makeSDK = (): GaugeSDK => {
  const anchorProvider = anchor.Provider.env();
  anchor.setProvider(anchorProvider);
  const provider = makeSaberProvider(anchorProvider);
  return GaugeSDK.load({
    provider,
  });
};

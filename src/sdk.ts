import { newProgramMap } from "@saberhq/anchor-contrib";
import type { AugmentedProvider, Provider } from "@saberhq/solana-contrib";
import { SolanaAugmentedProvider } from "@saberhq/solana-contrib";
import type { Signer } from "@solana/web3.js";

import type { GaugePrograms } from ".";
import { GAUGE_ADDRESSES, GAUGE_IDLS } from "./constants";
import { GaugeWrapper } from "./wrappers";

/**
 * Gauge SDK.
 */
export class GaugeSDK {
  constructor(
    readonly provider: AugmentedProvider,
    readonly programs: GaugePrograms
  ) {}

  /**
   * Creates a new instance of the SDK with the given keypair.
   */
  withSigner(signer: Signer): GaugeSDK {
    return GaugeSDK.load({
      provider: this.provider.withSigner(signer),
    });
  }

  /**
   * Loads the SDK.
   * @returns
   */
  static load({ provider }: { provider: Provider }): GaugeSDK {
    const programs: GaugePrograms = newProgramMap<GaugePrograms>(
      provider,
      GAUGE_IDLS,
      GAUGE_ADDRESSES
    );
    return new GaugeSDK(new SolanaAugmentedProvider(provider), programs);
  }

  /**
   * Gauge program helpers.
   */
  get gauge(): GaugeWrapper {
    return new GaugeWrapper(this);
  }
}

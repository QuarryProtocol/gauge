import { buildCoderMap } from "@saberhq/anchor-contrib";
import { PublicKey } from "@solana/web3.js";

import type { GaugeProgram, GaugeTypes } from "./programs";
import { GaugeJSON } from "./programs";

/**
 * Gauge program types.
 */
export interface GaugePrograms {
  Gauge: GaugeProgram;
}

/**
 * Gauge addresses.
 */
export const GAUGE_ADDRESSES = {
  Gauge: new PublicKey("GaugesLJrnVjNNWLReiw3Q7xQhycSBRgeHGTMDUaX231"),
};

/**
 * Program IDLs.
 */
export const GAUGE_IDLS = {
  Gauge: GaugeJSON,
};

/**
 * Coders.
 */
export const GAUGE_CODERS = buildCoderMap<{
  Gauge: GaugeTypes;
}>(GAUGE_IDLS, GAUGE_ADDRESSES);

/**
 * Default epoch duration (seconds) -- 7 days
 */
export const DEFAULT_EPOCH_DURATION_SECONDS = 60 * 60 * 24 * 7;

import { utils } from "@project-serum/anchor";
import { getProgramAddress } from "@saberhq/solana-contrib";
import { PublicKey } from "@solana/web3.js";

import { GAUGE_ADDRESSES } from "../../constants";

const encodeU32 = (num: number): Buffer => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(num);
  return buf;
};

/**
 * Finds the address of a GaugeVoter.
 */
export const findGaugeVoterAddress = async (
  gaugemeister: PublicKey,
  escrow: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode("GaugeVoter"),
      gaugemeister.toBuffer(),
      escrow.toBuffer(),
    ],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of a Gaugemeister.
 */
export const findGaugemeisterAddress = async (
  base: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode("Gaugemeister"), base.toBuffer()],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of a Gauge.
 */
export const findGaugeAddress = async (
  gaugemeister: PublicKey,
  quarry: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode("Gauge"),
      gaugemeister.toBuffer(),
      quarry.toBuffer(),
    ],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of a GaugeVote.
 */
export const findGaugeVoteAddress = async (
  gaugeVoter: PublicKey,
  gauge: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode("GaugeVote"),
      gaugeVoter.toBuffer(),
      gauge.toBuffer(),
    ],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of an epoch gauge.
 */
export const findEpochGaugeAddress = async (
  gauge: PublicKey,
  votingEpoch: number
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode("EpochGauge"),
      gauge.toBuffer(),
      encodeU32(votingEpoch),
    ],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of an epoch gauge voter.
 */
export const findEpochGaugeVoterAddress = async (
  gaugeVoter: PublicKey,
  votingEpoch: number
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode("EpochGaugeVoter"),
      gaugeVoter.toBuffer(),
      encodeU32(votingEpoch),
    ],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of an epoch gauge vote.
 */
export const findEpochGaugeVoteAddress = async (
  gaugeVote: PublicKey,
  votingEpoch: number
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode("EpochGaugeVote"),
      gaugeVote.toBuffer(),
      encodeU32(votingEpoch),
    ],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of a GaugeVoter.
 */
export const getGaugeVoterAddress = (
  gaugemeister: PublicKey,
  escrow: PublicKey
): PublicKey => {
  return getProgramAddress(
    [
      utils.bytes.utf8.encode("GaugeVoter"),
      gaugemeister.toBuffer(),
      escrow.toBuffer(),
    ],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of a Gaugemeister.
 */
export const getGaugemeisterAddress = (base: PublicKey): PublicKey => {
  return getProgramAddress(
    [utils.bytes.utf8.encode("Gaugemeister"), base.toBuffer()],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of a Gauge.
 */
export const getGaugeAddress = (
  gaugemeister: PublicKey,
  quarry: PublicKey
): PublicKey => {
  return getProgramAddress(
    [
      utils.bytes.utf8.encode("Gauge"),
      gaugemeister.toBuffer(),
      quarry.toBuffer(),
    ],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of a GaugeVote.
 */
export const getGaugeVoteAddress = (
  gaugeVoter: PublicKey,
  gauge: PublicKey
): PublicKey => {
  return getProgramAddress(
    [
      utils.bytes.utf8.encode("GaugeVote"),
      gaugeVoter.toBuffer(),
      gauge.toBuffer(),
    ],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of an epoch gauge.
 */
export const getEpochGaugeAddress = (
  gauge: PublicKey,
  votingEpoch: number
): PublicKey => {
  return getProgramAddress(
    [
      utils.bytes.utf8.encode("EpochGauge"),
      gauge.toBuffer(),
      encodeU32(votingEpoch),
    ],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of an epoch gauge voter.
 */
export const getEpochGaugeVoterAddress = (
  gaugeVoter: PublicKey,
  votingEpoch: number
): PublicKey => {
  return getProgramAddress(
    [
      utils.bytes.utf8.encode("EpochGaugeVoter"),
      gaugeVoter.toBuffer(),
      encodeU32(votingEpoch),
    ],
    GAUGE_ADDRESSES.Gauge
  );
};

/**
 * Finds the address of an epoch gauge vote.
 */
export const getEpochGaugeVoteAddress = (
  gaugeVote: PublicKey,
  votingEpoch: number
): PublicKey => {
  return getProgramAddress(
    [
      utils.bytes.utf8.encode("EpochGaugeVote"),
      gaugeVote.toBuffer(),
      encodeU32(votingEpoch),
    ],
    GAUGE_ADDRESSES.Gauge
  );
};

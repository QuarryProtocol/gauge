import { QUARRY_ADDRESSES } from "@quarryprotocol/quarry-sdk";
import type { TransactionEnvelope } from "@saberhq/solana-contrib";
import { u64 } from "@saberhq/token-utils";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { findEscrowAddress } from "@tribecahq/tribeca-sdk";

import { DEFAULT_EPOCH_DURATION_SECONDS } from "../../constants";
import type {
  EpochGaugeData,
  EpochGaugeVoteData,
  EpochGaugeVoterData,
  GaugeData,
  GaugemeisterData,
  GaugeProgram,
  GaugeVoteData,
  GaugeVoterData,
} from "../../programs/gauge";
import type { GaugeSDK } from "../../sdk";
import { findEpochGaugeVoterAddress, findGaugeVoterAddress } from ".";
import {
  findEpochGaugeAddress,
  findEpochGaugeVoteAddress,
  findGaugeAddress,
  findGaugemeisterAddress,
  findGaugeVoteAddress,
} from "./pda";

/**
 * Handles interacting with the Quarry Gauge program.
 */
export class GaugeWrapper {
  readonly program: GaugeProgram;

  /**
   * Constructor for a {@link GaugeWrapper}.
   * @param sdk
   */
  constructor(readonly sdk: GaugeSDK) {
    this.program = sdk.programs.Gauge;
  }

  get provider() {
    return this.sdk.provider;
  }

  async fetchGaugeVote(key: PublicKey): Promise<GaugeVoteData | null> {
    return await this.program.account.gaugeVote.fetchNullable(key);
  }

  async fetchGaugeVoter(key: PublicKey): Promise<GaugeVoterData | null> {
    return await this.program.account.gaugeVoter.fetchNullable(key);
  }

  async fetchGauge(key: PublicKey): Promise<GaugeData | null> {
    return await this.program.account.gauge.fetchNullable(key);
  }

  async fetchGaugemeister(key: PublicKey): Promise<GaugemeisterData | null> {
    return await this.program.account.gaugemeister.fetchNullable(key);
  }

  async fetchEpochGaugeVoter(
    key: PublicKey
  ): Promise<EpochGaugeVoterData | null> {
    return await this.program.account.epochGaugeVoter.fetchNullable(key);
  }

  async fetchEpochGaugeVote(
    key: PublicKey
  ): Promise<EpochGaugeVoteData | null> {
    return await this.program.account.epochGaugeVote.fetchNullable(key);
  }

  async fetchEpochGauge(key: PublicKey): Promise<EpochGaugeData | null> {
    return await this.program.account.epochGauge.fetchNullable(key);
  }

  /**
   * Creates a Gaugemeister.
   * @returns
   */
  async createGaugemeister({
    firstEpochStartsAt,
    operator,
    locker,
    foreman = this.provider.wallet.publicKey,
    baseKP = Keypair.generate(),
    epochDurationSeconds = DEFAULT_EPOCH_DURATION_SECONDS,
  }: {
    /**
     * When to start the first epoch.
     */
    firstEpochStartsAt: Date;
    /**
     * The initial foreman of the gauge. This should ideally be a DAO.
     */
    foreman?: PublicKey;
    /**
     * Base of the Gaugemeister.
     */
    baseKP?: Keypair;
    /**
     * Quarry Operator.
     */
    operator: PublicKey;
    /**
     * Locker.
     */
    locker: PublicKey;
    /**
     * Epoch duration seconds
     */
    epochDurationSeconds?: number;
  }): Promise<{
    gaugemeister: PublicKey;
    tx: TransactionEnvelope;
  }> {
    const [gaugemeister, bump] = await findGaugemeisterAddress(
      baseKP.publicKey
    );
    return {
      gaugemeister,
      tx: this.provider.newTX(
        [
          this.program.instruction.createGaugemeister(
            bump,
            foreman,
            epochDurationSeconds,
            new u64(Math.floor(firstEpochStartsAt.getTime() / 1_000)),
            {
              accounts: {
                base: baseKP.publicKey,
                gaugemeister,
                operator,
                locker,
                payer: this.provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
              },
            }
          ),
        ],
        [baseKP]
      ),
    };
  }

  /**
   * Creates a Gauge.
   * @returns
   */
  async createGauge({
    gaugemeister,
    quarry,
  }: {
    gaugemeister: PublicKey;
    quarry: PublicKey;
  }): Promise<{ gauge: PublicKey; tx: TransactionEnvelope }> {
    const [gauge, bump] = await findGaugeAddress(gaugemeister, quarry);
    return {
      gauge,
      tx: this.provider.newTX([
        this.program.instruction.createGauge(bump, {
          accounts: {
            gauge,
            gaugemeister,
            quarry,
            payer: this.provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
          },
        }),
      ]),
    };
  }

  /**
   * Creates a Gauge Voter.
   * @returns
   */
  async createGaugeVoter({
    gaugemeister,
    escrow,
  }: {
    gaugemeister: PublicKey;
    escrow: PublicKey;
  }): Promise<{ gaugeVoter: PublicKey; tx: TransactionEnvelope }> {
    const escrowInfo = await this.provider.getAccountInfo(escrow);
    if (!escrowInfo) {
      throw new Error("escrow not found");
    }
    const [gaugeVoter, bump] = await findGaugeVoterAddress(
      gaugemeister,
      escrow
    );
    return {
      gaugeVoter,
      tx: this.provider.newTX([
        this.program.instruction.createGaugeVoter(bump, {
          accounts: {
            gaugeVoter,
            gaugemeister,
            escrow,
            payer: this.provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
          },
        }),
      ]),
    };
  }

  /**
   * Creates a Gauge Vote.
   * @returns
   */
  async createGaugeVote({
    gaugeVoter,
    gauge,
  }: {
    gaugeVoter: PublicKey;
    gauge: PublicKey;
  }): Promise<{ gaugeVote: PublicKey; tx: TransactionEnvelope }> {
    const [gaugeVote, bump] = await findGaugeVoteAddress(gaugeVoter, gauge);
    return {
      gaugeVote,
      tx: this.provider.newTX([
        this.program.instruction.createGaugeVote(bump, {
          accounts: {
            gaugeVoter,
            gaugeVote,
            gauge,
            payer: this.provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
          },
        }),
      ]),
    };
  }

  /**
   * Enables a Gauge.
   * @returns
   */
  async enableGauge({
    gauge,
  }: {
    gauge: PublicKey;
  }): Promise<TransactionEnvelope> {
    const gaugeData = await this.fetchGauge(gauge);
    if (!gaugeData) {
      throw new Error("gauge data not found");
    }
    const gmData = await this.fetchGaugemeister(gaugeData.gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister data not found");
    }
    return this.provider.newTX([
      this.program.instruction.gaugeEnable({
        accounts: {
          gaugemeister: gaugeData.gaugemeister,
          gauge,
          foreman: gmData.foreman,
        },
      }),
    ]);
  }

  /**
   * Sets a vote.
   * @returns
   */
  async setVote({
    gauge,
    weight,
    owner = this.provider.wallet.publicKey,
  }: {
    gauge: PublicKey;
    weight: number;
    owner?: PublicKey;
  }): Promise<TransactionEnvelope> {
    const gaugeData = await this.fetchGauge(gauge);
    if (!gaugeData) {
      throw new Error("gauge not found");
    }
    const gmData = await this.fetchGaugemeister(gaugeData.gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister not found");
    }
    const [escrow] = await findEscrowAddress(gmData.locker, owner);
    const [gaugeVoter] = await findGaugeVoterAddress(
      gaugeData.gaugemeister,
      escrow
    );
    const gvrData = await this.fetchGaugeVoter(gaugeVoter);
    if (!gvrData) {
      throw new Error("gauge voter not found");
    }
    const [gaugeVote, gvBump] = await findGaugeVoteAddress(gaugeVoter, gauge);
    const gvData = await this.fetchGaugeVote(gaugeVote);
    return this.provider.newTX([
      !gvData &&
        this.program.instruction.createGaugeVote(gvBump, {
          accounts: {
            gaugeVoter,
            gaugeVote,
            gauge,
            payer: this.provider.wallet.publicKey,
            systemProgram: SystemProgram.programId,
          },
        }),
      this.program.instruction.gaugeSetVote(weight, {
        accounts: {
          escrow: gvrData.escrow,
          gaugemeister: gaugeData.gaugemeister,
          gauge,
          gaugeVoter,
          gaugeVote,
          voteDelegate: owner,
        },
      }),
    ]);
  }

  /**
   * Resets the Epoch Gauge Voter.
   */
  async resetEpochGaugeVoter({
    gaugemeister,
    owner = this.provider.wallet.publicKey,
  }: {
    /**
     * The Gaugemeister to reset.
     */
    gaugemeister: PublicKey;
    owner?: PublicKey;
  }): Promise<TransactionEnvelope> {
    const gmData = await this.fetchGaugemeister(gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister not found");
    }
    const [escrow] = await findEscrowAddress(gmData.locker, owner);
    const [gaugeVoter] = await findGaugeVoterAddress(gaugemeister, escrow);
    const [epochGaugeVoter] = await findEpochGaugeVoterAddress(
      gaugeVoter,
      gmData.currentRewardsEpoch + 1
    );
    return this.provider.newTX([
      this.program.instruction.resetEpochGaugeVoter({
        accounts: {
          gaugemeister,
          locker: gmData.locker,
          escrow,
          gaugeVoter,
          epochGaugeVoter,
        },
      }),
    ]);
  }

  /**
   * Prepares the Epoch Gauge Voter, which must be created before committing
   * votes for an epoch.
   */
  async prepareEpochGaugeVoter({
    gaugemeister,
    owner = this.provider.wallet.publicKey,
    payer = this.provider.wallet.publicKey,
  }: {
    gaugemeister: PublicKey;
    owner?: PublicKey;
    payer?: PublicKey;
  }): Promise<TransactionEnvelope> {
    const gmData = await this.fetchGaugemeister(gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister not found");
    }
    const [escrow] = await findEscrowAddress(gmData.locker, owner);
    const [gaugeVoter] = await findGaugeVoterAddress(gaugemeister, escrow);

    const [epochGaugeVoter, epochGaugeVoterBump] =
      await findEpochGaugeVoterAddress(
        gaugeVoter,
        gmData.currentRewardsEpoch + 1
      );
    return this.provider.newTX([
      this.program.instruction.prepareEpochGaugeVoter(epochGaugeVoterBump, {
        accounts: {
          gaugemeister,
          locker: gmData.locker,
          escrow,
          gaugeVoter,
          payer,
          systemProgram: SystemProgram.programId,
          epochGaugeVoter,
        },
      }),
    ]);
  }

  /**
   * Creates an Epoch Gauge.
   * @returns
   */
  async createEpochGauge({
    gauge,
    payer = this.provider.wallet.publicKey,
  }: {
    gauge: PublicKey;
    owner?: PublicKey;
    payer?: PublicKey;
  }): Promise<TransactionEnvelope> {
    const gaugeData = await this.fetchGauge(gauge);
    if (!gaugeData) {
      throw new Error("gauge not found");
    }
    const gmData = await this.fetchGaugemeister(gaugeData.gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister not found");
    }
    const votingEpoch = gmData.currentRewardsEpoch + 1;
    const [epochGauge, epochGaugeBump] = await findEpochGaugeAddress(
      gauge,
      votingEpoch
    );
    return this.provider.newTX([
      this.program.instruction.createEpochGauge(epochGaugeBump, votingEpoch, {
        accounts: {
          epochGauge,
          gauge,
          payer,
          systemProgram: SystemProgram.programId,
        },
      }),
    ]);
  }

  /**
   * Commits a vote.
   * @returns
   */
  async commitVote({
    gauge,
    owner = this.provider.wallet.publicKey,
    payer = this.provider.wallet.publicKey,
    skipEpochGaugeCreation = false,
  }: {
    gauge: PublicKey;
    owner?: PublicKey;
    payer?: PublicKey;
    /**
     * If true, skips the creation of the epoch gauge if it is not found.
     */
    skipEpochGaugeCreation?: boolean;
  }): Promise<TransactionEnvelope> {
    const gaugeData = await this.fetchGauge(gauge);
    if (!gaugeData) {
      throw new Error("gauge not found");
    }
    const gmData = await this.fetchGaugemeister(gaugeData.gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister not found");
    }
    const [escrow] = await findEscrowAddress(gmData.locker, owner);
    const [gaugeVoter] = await findGaugeVoterAddress(
      gaugeData.gaugemeister,
      escrow
    );
    const [gaugeVote] = await findGaugeVoteAddress(gaugeVoter, gauge);

    const votingEpoch = gmData.currentRewardsEpoch + 1;
    const [epochGauge, epochGaugeBump] = await findEpochGaugeAddress(
      gauge,
      votingEpoch
    );
    const [epochGaugeVoter] = await findEpochGaugeVoterAddress(
      gaugeVoter,
      votingEpoch
    );
    const createEpochGauge =
      !skipEpochGaugeCreation && !(await this.fetchEpochGauge(epochGauge));
    const [epochGaugeVote, voteBump] = await findEpochGaugeVoteAddress(
      gaugeVote,
      gmData.currentRewardsEpoch + 1
    );

    const accounts = {
      gaugemeister: gaugeData.gaugemeister,
      gauge,
      gaugeVoter,
      gaugeVote,
      payer,
      systemProgram: SystemProgram.programId,
      epochGauge,
      epochGaugeVoter,
      epochGaugeVote,
    };

    return this.provider.newTX([
      createEpochGauge &&
        this.program.instruction.createEpochGauge(epochGaugeBump, votingEpoch, {
          accounts: {
            epochGauge,
            gauge,
            payer,
            systemProgram: SystemProgram.programId,
          },
        }),
      this.program.instruction.gaugeCommitVote(voteBump, {
        accounts,
      }),
    ]);
  }

  /**
   * Reverts a vote.
   * @returns
   */
  async revertVote({
    gauge,
    owner = this.provider.wallet.publicKey,
    voteDelegate = this.provider.wallet.publicKey,
    payer = this.provider.wallet.publicKey,
  }: {
    gauge: PublicKey;
    owner?: PublicKey;
    voteDelegate?: PublicKey;
    payer?: PublicKey;
  }): Promise<TransactionEnvelope> {
    const gaugeData = await this.fetchGauge(gauge);
    if (!gaugeData) {
      throw new Error("gauge not found");
    }
    const gmData = await this.fetchGaugemeister(gaugeData.gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister not found");
    }
    const [escrow] = await findEscrowAddress(gmData.locker, owner);
    const [gaugeVoter] = await findGaugeVoterAddress(
      gaugeData.gaugemeister,
      escrow
    );
    const [gaugeVote] = await findGaugeVoteAddress(gaugeVoter, gauge);

    const votingEpoch = gmData.currentRewardsEpoch + 1;
    const [epochGauge] = await findEpochGaugeAddress(gauge, votingEpoch);
    const [epochGaugeVoter] = await findEpochGaugeVoterAddress(
      gaugeVoter,
      votingEpoch
    );
    const [epochGaugeVote] = await findEpochGaugeVoteAddress(
      gaugeVote,
      gmData.currentRewardsEpoch + 1
    );

    const accounts = {
      gaugemeister: gaugeData.gaugemeister,
      gauge,
      gaugeVoter,
      gaugeVote,
      epochGauge,
      epochGaugeVoter,
      epochGaugeVote,
      payer,
      escrow,
      voteDelegate,
    };

    return this.provider.newTX([
      this.program.instruction.gaugeRevertVote({
        accounts,
      }),
    ]);
  }

  /**
   * Triggers the next epoch.
   * @returns
   */
  triggerNextEpoch({
    gaugemeister,
  }: {
    gaugemeister: PublicKey;
  }): TransactionEnvelope {
    return this.provider.newTX([
      this.program.instruction.triggerNextEpoch({
        accounts: {
          gaugemeister,
        },
      }),
    ]);
  }

  /**
   * Synchronizes a current Gauge with the Quarry.
   * @returns
   */
  async syncGauge({
    gauge,
  }: {
    gauge: PublicKey;
  }): Promise<TransactionEnvelope> {
    const gaugeData = await this.fetchGauge(gauge);
    if (!gaugeData) {
      throw new Error("gauge data not found");
    }
    const gmData = await this.fetchGaugemeister(gaugeData.gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister data not found");
    }
    const [epochGauge] = await findEpochGaugeAddress(
      gauge,
      gmData.currentRewardsEpoch
    );
    return this.provider.newTX([
      this.program.instruction.syncGauge({
        accounts: {
          gaugemeister: gaugeData.gaugemeister,
          gauge,
          epochGauge,
          quarry: gaugeData.quarry,
          operator: gmData.operator,
          rewarder: gmData.rewarder,
          quarryMineProgram: QUARRY_ADDRESSES.Mine,
          quarryOperatorProgram: QUARRY_ADDRESSES.Operator,
        },
      }),
    ]);
  }
}

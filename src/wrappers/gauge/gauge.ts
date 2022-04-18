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
   * Disable a Gauge.
   * @returns
   */
  async disableGauge({
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
      this.program.instruction.gaugeDisable({
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
          escrow,
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
   * Creates votes if they do not exist.
   *
   * @returns The {@link TransactionEnvelope}s to create votes.
   */
  async createMissingVotes({
    gaugemeister,
    gauges,
    owner = this.provider.wallet.publicKey,
  }: {
    gaugemeister: PublicKey;
    gauges: PublicKey[];
    owner?: PublicKey;
  }): Promise<TransactionEnvelope[]> {
    const gmData = await this.fetchGaugemeister(gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister not found");
    }
    const [escrow] = await findEscrowAddress(gmData.locker, owner);
    const [gaugeVoter] = await findGaugeVoterAddress(gaugemeister, escrow);

    const gaugeVotes = await Promise.all(
      gauges.map(async (gauge) => {
        const [gaugeVote] = await findGaugeVoteAddress(gaugeVoter, gauge);
        return { gaugeVote };
      })
    );
    const gaugeVotesData =
      await this.provider.connection.getMultipleAccountsInfo(
        gaugeVotes.map((gv) => gv.gaugeVote)
      );

    const result = await Promise.all(
      gauges.map(async (gauge, i) => {
        const gvData = gaugeVotesData[i];
        const [gaugeVote, gvBump] = await findGaugeVoteAddress(
          gaugeVoter,
          gauge
        );
        if (!gvData) {
          return this.provider.newTX([
            this.program.instruction.createGaugeVote(gvBump, {
              accounts: {
                gaugeVoter,
                gaugeVote,
                gauge,
                payer: this.provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
              },
            }),
          ]);
        }
        return null;
      })
    );
    return result.filter((tx): tx is TransactionEnvelope => !!tx);
  }

  /**
   * Sets multiple votes without checking to see that the proper gauges have been created.
   * @returns Transactions
   */
  async setVotesUnchecked({
    gaugemeister,
    weights,
    owner = this.provider.wallet.publicKey,
  }: {
    gaugemeister: PublicKey;
    weights: {
      gauge: PublicKey;
      weight: number;
    }[];
    owner?: PublicKey;
  }): Promise<TransactionEnvelope[]> {
    const gmData = await this.fetchGaugemeister(gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister not found");
    }
    const [escrow] = await findEscrowAddress(gmData.locker, owner);
    const [gaugeVoter] = await findGaugeVoterAddress(gaugemeister, escrow);

    const gaugeVotes = await Promise.all(
      weights.map(async ({ gauge, weight }) => {
        const [gaugeVote] = await findGaugeVoteAddress(gaugeVoter, gauge);
        return { gaugeVote, gauge, weight };
      })
    );

    return gaugeVotes.map(({ gauge, weight, gaugeVote }) => {
      return this.provider.newTX([
        this.program.instruction.gaugeSetVote(weight, {
          accounts: {
            escrow,
            gaugemeister,
            gauge,
            gaugeVoter,
            gaugeVote,
            voteDelegate: owner,
          },
        }),
      ]);
    });
  }

  /**
   * Sets multiple votes.
   * @returns Transactions
   */
  async setVotes({
    gaugemeister,
    weights,
    owner = this.provider.wallet.publicKey,
  }: {
    gaugemeister: PublicKey;
    weights: {
      gauge: PublicKey;
      weight: number;
    }[];
    owner?: PublicKey;
  }): Promise<TransactionEnvelope[]> {
    const gmData = await this.fetchGaugemeister(gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister not found");
    }
    const [escrow] = await findEscrowAddress(gmData.locker, owner);
    const [gaugeVoter] = await findGaugeVoterAddress(gaugemeister, escrow);

    const gaugeVotes = await Promise.all(
      weights.map(async ({ gauge }) => {
        const [gaugeVote] = await findGaugeVoteAddress(gaugeVoter, gauge);
        return { gaugeVote };
      })
    );
    const gaugeVotesData =
      await this.provider.connection.getMultipleAccountsInfo(
        gaugeVotes.map((gv) => gv.gaugeVote)
      );

    return await Promise.all(
      weights.map(async ({ gauge, weight }, i) => {
        const gvData = gaugeVotesData[i];
        const [gaugeVote, gvBump] = await findGaugeVoteAddress(
          gaugeVoter,
          gauge
        );
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
              escrow,
              gaugemeister,
              gauge,
              gaugeVoter,
              gaugeVote,
              voteDelegate: owner,
            },
          }),
        ]);
      })
    );
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
   * Commits votes for multiple gauges.
   * @returns
   */
  async commitVotes({
    gaugemeister,
    gauges,
    owner = this.provider.wallet.publicKey,
    payer = this.provider.wallet.publicKey,
    skipEpochGaugeCreation = false,
    checkGaugeVotesExist = true,
  }: {
    /**
     * The key of the Gaugemeister.
     */
    gaugemeister: PublicKey;
    /**
     * List of all gauges to attempt to commit.
     */
    gauges: PublicKey[];
    /**
     * Escrow owner.
     */
    owner?: PublicKey;
    /**
     * Funder of the EpochGaugeVotes.
     */
    payer?: PublicKey;
    /**
     * If true, skips the creation of the epoch gauge if it is not found.
     */
    skipEpochGaugeCreation?: boolean;
    /**
     * If true, checks to see that a GaugeVote exists for each Gauge provided.
     */
    checkGaugeVotesExist?: boolean;
  }): Promise<TransactionEnvelope[]> {
    const gmData = await this.fetchGaugemeister(gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister not found");
    }
    const [escrow] = await findEscrowAddress(gmData.locker, owner);
    const [gaugeVoter] = await findGaugeVoterAddress(gaugemeister, escrow);

    const votingEpoch = gmData.currentRewardsEpoch + 1;

    const myGaugeVotes = await Promise.all(
      gauges.map(async (gaugeKey) => {
        const [gaugeVote] = await findGaugeVoteAddress(gaugeVoter, gaugeKey);
        const [epochGauge, epochGaugeBump] = await findEpochGaugeAddress(
          gaugeKey,
          votingEpoch
        );
        return { gaugeKey, gaugeVote, epochGauge, epochGaugeBump };
      })
    );

    const gaugeVotesInfo = checkGaugeVotesExist
      ? await this.provider.connection.getMultipleAccountsInfo(
          myGaugeVotes.map((gv) => gv.gaugeVote)
        )
      : [];

    const epochGaugesInfo = !skipEpochGaugeCreation
      ? await this.provider.connection.getMultipleAccountsInfo(
          myGaugeVotes.map((gv) => gv.epochGauge)
        )
      : [];

    const voteTXs = await Promise.all(
      myGaugeVotes.map(async (myGaugeVote, i) => {
        const { gaugeKey, gaugeVote, epochGauge, epochGaugeBump } = myGaugeVote;

        // if the gauge vote doesn't exist, don't commit the vote.
        if (checkGaugeVotesExist && !gaugeVotesInfo[i]) {
          return null;
        }

        const createEpochGauge = !skipEpochGaugeCreation && !epochGaugesInfo[i];

        const [epochGaugeVoter] = await findEpochGaugeVoterAddress(
          gaugeVoter,
          votingEpoch
        );
        const [epochGaugeVote, voteBump] = await findEpochGaugeVoteAddress(
          gaugeVote,
          gmData.currentRewardsEpoch + 1
        );
        const accounts = {
          gaugemeister,
          gauge: gaugeKey,
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
            this.program.instruction.createEpochGauge(
              epochGaugeBump,
              votingEpoch,
              {
                accounts: {
                  epochGauge,
                  gauge: gaugeKey,
                  payer,
                  systemProgram: SystemProgram.programId,
                },
              }
            ),
          this.program.instruction.gaugeCommitVote(voteBump, {
            accounts,
          }),
        ]);
      })
    );
    return voteTXs.filter((tx): tx is TransactionEnvelope => !!tx);
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
   * Reverts votes for multiple gauges.
   * @returns
   */
  async revertVotes({
    gaugemeister,
    gauges,
    owner = this.provider.wallet.publicKey,
    voteDelegate = this.provider.wallet.publicKey,
    payer = this.provider.wallet.publicKey,
  }: {
    gaugemeister: PublicKey;
    /**
     * List of all gauges to check for reversion.
     */
    gauges: PublicKey[];
    owner?: PublicKey;
    voteDelegate?: PublicKey;
    payer?: PublicKey;
  }): Promise<TransactionEnvelope[]> {
    const gmData = await this.fetchGaugemeister(gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister not found");
    }
    const [escrow] = await findEscrowAddress(gmData.locker, owner);
    const [gaugeVoter] = await findGaugeVoterAddress(gaugemeister, escrow);

    const votingEpoch = gmData.currentRewardsEpoch + 1;

    const myGaugeVotes = await Promise.all(
      gauges.map(async (gaugeKey) => {
        const [gaugeVote] = await findGaugeVoteAddress(gaugeVoter, gaugeKey);
        const [epochGaugeVote] = await findEpochGaugeVoteAddress(
          gaugeVote,
          votingEpoch
        );
        return { gaugeKey, gaugeVote, epochGaugeVote };
      })
    );
    const epochGaugeVotesInfo =
      await this.provider.connection.getMultipleAccountsInfo(
        myGaugeVotes.map((gv) => gv.epochGaugeVote)
      );

    const revertTXs = await Promise.all(
      epochGaugeVotesInfo.map(async (gvi, i) => {
        if (!gvi) {
          return null;
        }
        const myGaugeVote = myGaugeVotes[i];
        if (!myGaugeVote) {
          return null;
        }

        const { gaugeKey, gaugeVote, epochGaugeVote } = myGaugeVote;
        const [epochGauge] = await findEpochGaugeAddress(gaugeKey, votingEpoch);
        const [epochGaugeVoter] = await findEpochGaugeVoterAddress(
          gaugeVoter,
          votingEpoch
        );

        const accounts = {
          gaugemeister,
          gauge: gaugeKey,
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
      })
    );
    return revertTXs.filter((tx): tx is TransactionEnvelope => !!tx);
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

  /**
   * Sets parameters on a given Gaugemeister.
   */
  async setGaugemeisterParams({
    gaugemeister,
    newEpochDurationSeconds,
    newForeman,
  }: {
    gaugemeister: PublicKey;
    newEpochDurationSeconds?: number;
    newForeman?: PublicKey;
  }): Promise<TransactionEnvelope> {
    const gmData = await this.fetchGaugemeister(gaugemeister);
    if (!gmData) {
      throw new Error("gaugemeister data not found");
    }

    const epochDurationSeconds =
      newEpochDurationSeconds ?? gmData.epochDurationSeconds;
    const foreman = newForeman ?? gmData.foreman;

    return this.provider.newTX([
      this.program.instruction.setGaugemeisterParams(
        epochDurationSeconds,
        foreman,
        {
          accounts: {
            gaugemeister,
            foreman: gmData.foreman,
          },
        }
      ),
    ]);
  }

  /**
   * Closes an EpochGaugeVote account.
   * @returns
   */
  async closeEpochGaugeVote({
    gauge,
    gaugemeister,
    voteDelegate = this.provider.walletKey,
    escrow,
    votingEpoch,
    recipient = voteDelegate,
  }: {
    gauge: PublicKey;
    gaugemeister: PublicKey;
    voteDelegate?: PublicKey;
    escrow: PublicKey;
    votingEpoch: number;
    recipient?: PublicKey;
  }): Promise<TransactionEnvelope> {
    const [gaugeVoter] = await findGaugeVoterAddress(gaugemeister, escrow);
    const [gaugeVote] = await findGaugeVoteAddress(gaugeVoter, gauge);
    const [epochGaugeVote] = await findEpochGaugeVoteAddress(
      gaugeVote,
      votingEpoch
    );
    return this.provider.newTX([
      this.program.instruction.closeEpochGaugeVote(votingEpoch, {
        accounts: {
          epochGaugeVote,
          gaugemeister,
          gauge,
          gaugeVoter,
          gaugeVote,
          escrow,
          voteDelegate,
          recipient,
        },
      }),
    ]);
  }
}

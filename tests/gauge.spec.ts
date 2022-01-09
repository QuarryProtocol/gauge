import type { Operator } from "@quarryprotocol/quarry-sdk";
import { QUARRY_CODERS } from "@quarryprotocol/quarry-sdk";
import { matchError } from "@saberhq/anchor-contrib";
import { expectTXTable } from "@saberhq/chai-solana";
import type { TokenAmount } from "@saberhq/token-utils";
import { createMint, u64 } from "@saberhq/token-utils";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { LockerWrapper } from "@tribecahq/tribeca-sdk";
import BN from "bn.js";
import { expect } from "chai";
import invariant from "tiny-invariant";

import {
  findEpochGaugeVoteAddress,
  findEpochGaugeVoterAddress,
  findGaugeVoteAddress,
  GaugeErrors,
} from "../src";
import { GaugeSDK } from "../src/sdk";
import { makeSDK } from "./workspace";
import { setupEnvironment } from "./workspace/setup";

const TEST_EPOCH_SECONDS = 3;

describe("Gauge", () => {
  const sdk = makeSDK();

  const adminKP = Keypair.generate();
  const adminSDK = GaugeSDK.load({
    provider: sdk.provider.withSigner(adminKP),
  });

  const voterKP = Keypair.generate();
  const voterSDK = GaugeSDK.load({
    provider: adminSDK.provider.withSigner(voterKP),
  });

  let operator: PublicKey;
  let operatorW: Operator;
  let lockerW: LockerWrapper;
  let voterEscrow: PublicKey;
  let lockAmount: TokenAmount;

  let quarry: PublicKey;
  let gaugemeister: PublicKey;
  let gaugeVoter: PublicKey;

  before(async () => {
    await (
      await adminSDK.provider.requestAirdrop(LAMPORTS_PER_SOL * 10)
    ).wait();
    await (
      await voterSDK.provider.requestAirdrop(LAMPORTS_PER_SOL * 10)
    ).wait();
  });

  beforeEach("setup environment", async () => {
    const env = await setupEnvironment({ voterSDK, adminSDK });

    operator = env.operator;
    operatorW = env.operatorW;
    lockerW = env.lockerW;
    voterEscrow = env.voterEscrow;
    lockAmount = env.lockAmount;
  });

  let gauge: PublicKey;
  let firstEpochStartsAt: Date;

  beforeEach("setup gauge", async () => {
    firstEpochStartsAt = new Date();
    const { gaugemeister: theGaugemeister, tx: createGMTX } =
      await adminSDK.gauge.createGaugemeister({
        firstEpochStartsAt,
        operator: operatorW.key,
        locker: lockerW.locker,
        epochDurationSeconds: TEST_EPOCH_SECONDS,
      });
    gaugemeister = theGaugemeister;

    await expectTXTable(createGMTX, "create gaugemeister").to.be.fulfilled;
    await expectTXTable(
      operatorW.setShareAllocator(gaugemeister),
      "set GM to share allocator"
    ).to.be.fulfilled;

    const farmTokenMint = await createMint(adminSDK.provider);
    const { quarry: theQuarry, tx: createQuarryTX } =
      await operatorW.delegateCreateQuarry({
        tokenMint: farmTokenMint,
      });
    quarry = theQuarry;
    await expectTXTable(createQuarryTX, "create quarry").to.be.fulfilled;

    const { gauge: theGauge, tx: createGaugeTX } =
      await voterSDK.gauge.createGauge({
        gaugemeister,
        quarry,
      });
    await expectTXTable(createGaugeTX, "create gauge").to.be.fulfilled;
    gauge = theGauge;

    const { gaugeVoter: theGaugeVoter, tx: createGaugeVoterTX } =
      await voterSDK.gauge.createGaugeVoter({
        gaugemeister,
        escrow: voterEscrow,
      });
    await expectTXTable(createGaugeVoterTX, "create gauge voter").to.be
      .fulfilled;
    gaugeVoter = theGaugeVoter;

    const { gaugeVote: _gaugeVote, tx: createGaugeVoteTX } =
      await voterSDK.gauge.createGaugeVote({
        gaugeVoter,
        gauge,
      });
    await expectTXTable(createGaugeVoteTX, "create gauge vote").to.be.fulfilled;
  });

  it("should have correct gaugemeister data", async () => {
    const gm = await adminSDK.gauge.fetchGaugemeister(gaugemeister);
    invariant(gm);
    expect(gm.foreman).to.eqAddress(adminSDK.provider.wallet.publicKey);
  });

  describe("single gauge", () => {
    it("cannot sync the 0th epoch", async () => {
      const syncTX = await voterSDK.gauge.syncGauge({
        gauge,
      });
      // 0th epoch gauge does not exist
      await expectTXTable(syncTX, "sync gauge").to.be.rejectedWith(/0xbc4/);
    });

    it("allows syncing after epoch step", async () => {
      const currentGM = await voterSDK.gauge.fetchGaugemeister(gaugemeister);
      invariant(currentGM);
      expect(currentGM.currentRewardsEpoch).to.eq(0);
      expect(currentGM.epochDurationSeconds).to.eq(TEST_EPOCH_SECONDS);
      expect(currentGM.locker).to.eqAddress(lockerW.locker);
      expect(currentGM.operator).to.eqAddress(operator);

      // create the epoch gauge
      await expectTXTable(
        await voterSDK.gauge.createEpochGauge({
          gauge,
        })
      ).to.be.fulfilled;

      await expectTXTable(
        voterSDK.gauge.triggerNextEpoch({ gaugemeister }),
        "trigger epoch step"
      ).to.be.fulfilled;

      const newGM = await voterSDK.gauge.fetchGaugemeister(gaugemeister);
      invariant(newGM);
      expect(newGM.currentRewardsEpoch).to.eq(1);
      expect(newGM.epochDurationSeconds).to.eq(TEST_EPOCH_SECONDS);
      expect(newGM.locker).to.eqAddress(lockerW.locker);
      expect(newGM.operator).to.eqAddress(operator);

      // we aren't ready for the next epoch yet
      await expectTXTable(
        voterSDK.gauge.triggerNextEpoch({ gaugemeister }),
        "trigger next epoch"
      ).to.be.rejectedWith(matchError(GaugeErrors.NextEpochNotReached));

      // gauge not synced
      const oldGauge = await voterSDK.gauge.fetchGauge(gauge);
      invariant(oldGauge);

      const syncTX = await voterSDK.gauge.syncGauge({
        gauge,
      });
      await expectTXTable(syncTX, "sync gauge").to.be.fulfilled;

      // gauge synced
      const newGauge = await voterSDK.gauge.fetchGauge(gauge);
      invariant(newGauge);
    });

    it("syncs based on voter weight", async () => {
      // create the epoch gauge
      const createEpochGaugeTX = await voterSDK.gauge.createEpochGauge({
        gauge,
      });

      // Trigger an epoch so that we have some voting weight
      await expectTXTable(
        createEpochGaugeTX.combine(
          voterSDK.gauge.triggerNextEpoch({ gaugemeister })
        ),
        "trigger epoch step"
      ).to.be.fulfilled;

      const farmToken2Mint = await createMint(adminSDK.provider);
      const { quarry: quarry2, tx: createQuarry2TX } =
        await operatorW.delegateCreateQuarry({
          tokenMint: farmToken2Mint,
        });
      await expectTXTable(createQuarry2TX, "create quarry 2").to.be.fulfilled;

      const { gauge: gauge2, tx: createGauge2TX } =
        await voterSDK.gauge.createGauge({
          gaugemeister,
          quarry: quarry2,
        });
      await expectTXTable(createGauge2TX, "create gauge 2").to.be.fulfilled;

      await expectTXTable(
        await adminSDK.gauge.enableGauge({
          gauge,
        }),
        "enable gauge 1"
      ).to.be.fulfilled;
      await expectTXTable(
        await adminSDK.gauge.enableGauge({
          gauge: gauge2,
        }),
        "enable gauge 2"
      ).to.be.fulfilled;

      await expectTXTable(
        await voterSDK.gauge.setVote({
          gauge,
          weight: 50,
        }),
        "vote gauge 1"
      ).to.be.fulfilled;
      await expectTXTable(
        await voterSDK.gauge.setVote({
          gauge: gauge2,
          weight: 25,
        }),
        "vote gauge 2"
      ).to.be.fulfilled;

      // rewards epoch = 1
      // voting epoch = 2

      const gmData = await voterSDK.gauge.fetchGaugemeister(gaugemeister);
      invariant(gmData);
      expect(gmData.currentRewardsEpoch).to.eq(1);
      expect(gmData.epochDurationSeconds).to.eq(TEST_EPOCH_SECONDS);
      expect(gmData.locker).to.eqAddress(lockerW.locker);
      expect(gmData.operator).to.eqAddress(operator);

      const gaugeVoterData = await voterSDK.gauge.fetchGaugeVoter(gaugeVoter);
      invariant(gaugeVoterData);
      expect(gaugeVoterData.owner).to.eqAddress(
        voterSDK.provider.wallet.publicKey
      );

      expect(gaugeVoterData.totalWeight).to.eq(75);
      expect(gaugeVoterData.gaugemeister).to.eqAddress(gaugemeister);

      await expectTXTable(
        await voterSDK.gauge.prepareEpochGaugeVoter({
          gaugemeister,
        }),
        "prepare epoch gauge voter",
        { verbosity: "error" }
      ).to.be.fulfilled;

      const commitTXs = await voterSDK.gauge.commitVotes({
        gaugemeister,
        gauges: [gauge, gauge2],
      });
      for (const [i, commitTX] of commitTXs.entries()) {
        await expectTXTable(commitTX, `commit gauge ${i + 1}`).to.be.fulfilled;
      }

      const newGVData = await voterSDK.gauge.fetchGaugeVoter(gaugeVoter);
      invariant(newGVData);
      expect(newGVData.owner).to.eqAddress(voterSDK.provider.wallet.publicKey);
      expect(newGVData.totalWeight).to.eq(75);

      const [newEpochGaugeVoter] = await findEpochGaugeVoterAddress(
        gaugeVoter,
        2
      );
      const newEpochVoterData = await voterSDK.gauge.fetchEpochGaugeVoter(
        newEpochGaugeVoter
      );
      invariant(newEpochVoterData);

      // should be around 1,000 veTOK
      expect(newEpochVoterData.allocatedPower).to.bignumber.gt(
        lockAmount.toU64().mul(new u64(9_999)).div(new u64(10_000))
      );
      expect(newEpochVoterData.allocatedPower).to.bignumber.lt(
        lockAmount.toU64()
      );

      expect(newGVData.gaugemeister).to.eqAddress(gaugemeister);

      const newGMData = await voterSDK.gauge.fetchGaugemeister(gaugemeister);
      invariant(newGMData);
      expect(newGMData.currentRewardsEpoch).to.eq(1);
      expect(newGMData.epochDurationSeconds).to.eq(TEST_EPOCH_SECONDS);
      expect(newGMData.locker).to.eqAddress(lockerW.locker);
      expect(newGMData.operator).to.eqAddress(operator);

      // Sync the gauges at the next epoch
      await expectTXTable(
        voterSDK.gauge.triggerNextEpoch({ gaugemeister }),
        "next epoch"
      ).to.be.fulfilled;
      await expectTXTable(
        await voterSDK.gauge.syncGauge({ gauge }),
        "sync gauge 1"
      ).to.be.fulfilled;
      await expectTXTable(
        await voterSDK.gauge.syncGauge({ gauge: gauge2 }),
        "sync gauge 2"
      ).to.be.fulfilled;

      const quarry1Data = await QUARRY_CODERS.Mine.getProgram(
        voterSDK.provider
      ).account.quarry.fetch(quarry);
      const quarry2Data = await QUARRY_CODERS.Mine.getProgram(
        voterSDK.provider
      ).account.quarry.fetch(quarry2);

      expect(quarry1Data.rewardsShare).to.bignumber.not.eq("0");
      expect(quarry2Data.rewardsShare).to.bignumber.not.eq("0");
      expect(
        quarry2Data.rewardsShare
          .mul(new BN(2))
          .sub(quarry1Data.rewardsShare)
          .abs(),
        "quarry 1 should have approx 2x quarry 2"
      ).to.bignumber.lt(new BN(2));
    });
  });

  describe("revert", () => {
    it("can revert votes", async () => {
      // create the epoch gauge
      const createEpochGaugeTX = await voterSDK.gauge.createEpochGauge({
        gauge,
      });

      // Trigger an epoch so that we have some voting weight
      await expectTXTable(
        createEpochGaugeTX.combine(
          voterSDK.gauge.triggerNextEpoch({ gaugemeister })
        ),
        "trigger epoch step"
      ).to.be.fulfilled;

      // enable and vote for the gauge
      await expectTXTable(
        await adminSDK.gauge.enableGauge({
          gauge,
        }),
        "enable gauge 1"
      ).to.be.fulfilled;
      await expectTXTable(
        await voterSDK.gauge.setVote({
          gauge,
          weight: 50,
        }),
        "vote gauge 1"
      ).to.be.fulfilled;
      await expectTXTable(
        await voterSDK.gauge.prepareEpochGaugeVoter({
          gaugemeister,
        }),
        "prepare epoch gauge voter",
        { verbosity: "error" }
      ).to.be.fulfilled;
      await expectTXTable(
        await voterSDK.gauge.commitVote({
          gauge,
        }),
        "commit gauge",
        {
          verbosity: "error",
        }
      ).to.be.fulfilled;

      const gm = await voterSDK.gauge.fetchGaugemeister(gaugemeister);
      invariant(gm);
      expect(gm.currentRewardsEpoch).to.eq(1);

      const [epochGaugeVoter] = await findEpochGaugeVoterAddress(
        gaugeVoter,
        gm.currentRewardsEpoch + 1
      );
      const [gaugeVote] = await findGaugeVoteAddress(gaugeVoter, gauge);
      const [epochGaugeVote] = await findEpochGaugeVoteAddress(
        gaugeVote,
        gm.currentRewardsEpoch + 1
      );

      // votes should exist
      const gaugeVoterData = await voterSDK.gauge.fetchGaugeVoter(gaugeVoter);
      invariant(gaugeVoterData);
      expect(gaugeVoterData.owner).to.eqAddress(
        voterSDK.provider.wallet.publicKey
      );
      expect(gaugeVoterData.totalWeight).to.eq(50);

      const epochGaugeVoterData = await voterSDK.gauge.fetchEpochGaugeVoter(
        epochGaugeVoter
      );
      invariant(epochGaugeVoterData);

      // should be around 1,000 veTOK
      expect(epochGaugeVoterData.allocatedPower).to.bignumber.gt(
        lockAmount.toU64().mul(new u64(9_999)).div(new u64(10_000))
      );
      expect(epochGaugeVoterData.allocatedPower).to.bignumber.lt(
        lockAmount.toU64()
      );

      // epoch gauge vote should be the full power
      const evoteData = await voterSDK.gauge.fetchEpochGaugeVote(
        epochGaugeVote
      );
      invariant(evoteData);
      expect(evoteData.allocatedPower).to.bignumber.eq(
        epochGaugeVoterData.allocatedPower
      );

      // revert votes
      const revertTXs = await voterSDK.gauge.revertVotes({
        gaugemeister,
        gauges: [gauge],
      });
      for (const [i, revertTX] of revertTXs.entries()) {
        await expectTXTable(revertTX, `revert gauge ${i + 1}`).to.be.fulfilled;
      }

      // vote weight allocation should remain after revert
      const gvAfterRevert = await voterSDK.gauge.fetchGaugeVoter(gaugeVoter);
      invariant(gvAfterRevert);
      expect(gvAfterRevert.owner).to.eqAddress(
        voterSDK.provider.wallet.publicKey
      );
      expect(gvAfterRevert.totalWeight).to.eq(50);

      // zero power after revert
      const evAfterRevert = await voterSDK.gauge.fetchEpochGaugeVoter(
        epochGaugeVoter
      );
      invariant(evAfterRevert);
      expect(evAfterRevert.allocatedPower).to.bignumber.eq("0");

      // epoch gauge vote should be deleted
      const evoteAfterRevert = await voterSDK.gauge.fetchEpochGaugeVote(
        epochGaugeVote
      );
      expect(evoteAfterRevert).to.be.null;
    });
  });
});

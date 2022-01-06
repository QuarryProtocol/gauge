import { GokiSDK } from "@gokiprotocol/client";
import type { Operator, RewarderWrapper } from "@quarryprotocol/quarry-sdk";
import { findMinterAddress, QuarrySDK } from "@quarryprotocol/quarry-sdk";
import { expectTXTable } from "@saberhq/chai-solana";
import { Token, TokenAmount, u64 } from "@saberhq/token-utils";
import type { PublicKey } from "@solana/web3.js";
import {
  createLocker,
  LockerWrapper,
  TribecaSDK,
} from "@tribecahq/tribeca-sdk";
import BN from "bn.js";
import invariant from "tiny-invariant";

import type { GaugeSDK } from "../../src";

/**
 * Sets up the Tribeca voting escrow and Quarry Rewarder and locks tokens.
 *
 * @param param0
 * @returns
 */
export const setupEnvironment = async ({
  voterSDK,
  adminSDK,
}: {
  voterSDK: GaugeSDK;
  adminSDK: GaugeSDK;
}): Promise<{
  govToken: Token;
  lockAmount: TokenAmount;
  operator: PublicKey;
  operatorW: Operator;
  lockerW: LockerWrapper;
  rewarderW: RewarderWrapper;
  voterEscrow: PublicKey;
}> => {
  // Set up Quarry
  const quarrySDK = QuarrySDK.load({ provider: adminSDK.provider });
  const {
    mintWrapper,
    tx: newMintWrapperTX,
    mint,
  } = await quarrySDK.mintWrapper.newWrapperAndMint({
    hardcap: new u64(10_000_000000),
    decimals: 6,
  });

  const govTokenMint = mint;
  const govToken = Token.fromMint(mint, 6);

  const createMinterTX = await quarrySDK.mintWrapper.newMinterWithAllowance(
    mintWrapper,
    adminSDK.provider.wallet.publicKey,
    new u64(1_000_000_000000)
  );
  await expectTXTable(
    newMintWrapperTX.combine(createMinterTX),
    "create minter/mint wrapper"
  ).to.be.fulfilled;

  const [minterAddress] = await findMinterAddress(
    mintWrapper,
    adminSDK.provider.wallet.publicKey
  );
  const minterInfo = await quarrySDK.mintWrapper.fetchMinter(
    mintWrapper,
    adminSDK.provider.wallet.publicKey
  );
  const accountInfo =
    await quarrySDK.programs.MintWrapper.provider.connection.getAccountInfo(
      minterAddress
    );
  invariant(minterInfo && accountInfo, "minter info");
  const lockAmount = TokenAmount.parse(govToken, "1000");
  const performMintTX = await quarrySDK.mintWrapper.performMintTo({
    amount: lockAmount,
    mintWrapper,
    destOwner: voterSDK.provider.wallet.publicKey,
  });

  const { tx: createRewarderTX, key: rewarder } =
    await quarrySDK.mine.createRewarder({
      mintWrapper,
    });
  await expectTXTable(
    performMintTX.combine(createRewarderTX),
    "perform mint and create rewarder"
  ).to.be.fulfilled;

  const { tx: createOperatorTX, key: operatorKey } =
    await quarrySDK.createOperator({
      rewarder,
    });
  const operator = operatorKey;

  const rewarderW = await quarrySDK.mine.loadRewarderWrapper(rewarder);
  const transferTX = rewarderW.transferAuthority({
    nextAuthority: operatorKey,
  });
  await expectTXTable(
    transferTX.combine(createOperatorTX),
    "transfer authority and create operator"
  ).to.be.fulfilled;

  const theOperatorW = await quarrySDK.loadOperator(operator);
  invariant(theOperatorW, "operator");
  const operatorW = theOperatorW;

  // Setup Locker
  const tribecaSDK = TribecaSDK.load({ provider: adminSDK.provider });
  const gokiSDK = GokiSDK.load({ provider: adminSDK.provider });

  const owners = [adminSDK.provider.wallet.publicKey];
  const { createTXs, lockerWrapper } = await createLocker({
    sdk: tribecaSDK,
    gokiSDK,
    govTokenMint,
    owners,
    lockerParams: {
      maxStakeVoteMultiplier: 1,
      maxStakeDuration: new BN(10 * 24 * 60 * 60), // 10 days
    },
  });
  const lockerW = lockerWrapper;

  for (const { tx, title } of createTXs) {
    await expectTXTable(tx, title).to.be.fulfilled;
  }

  // set up the voter's escrow
  const voterTribecaSDK = TribecaSDK.load({ provider: voterSDK.provider });
  const voterLockerW = new LockerWrapper(
    voterTribecaSDK,
    lockerW.locker,
    lockerW.governorKey
  );
  const { escrow, instruction: createEscrowIX } =
    await voterLockerW.getOrCreateEscrow();
  await expectTXTable(
    voterSDK.provider.newTX([createEscrowIX]),
    "create escrow"
  ).to.be.fulfilled;
  await expectTXTable(
    await voterLockerW.lockTokens({
      amount: lockAmount.toU64(),
      duration: new BN(10 * 24 * 60 * 60), // lock tokens for 10 days
    }),
    "lock tokens"
  ).to.be.fulfilled;
  const voterEscrow = escrow;

  return {
    govToken,
    lockAmount,
    operator,
    operatorW,
    lockerW,
    rewarderW,
    voterEscrow,
  };
};

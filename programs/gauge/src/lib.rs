//! Allows Tribeca Voting Escrows to vote on token allocations between different Quarries.
//!
//! Detailed documentation is available on the [Tribeca documentation site.](https://docs.tribeca.so/voting-escrow/gauges/)
//!
//! # License
//!
//! The Quarry Gauge program and SDK are distributed under the Affero GPL v3.0 license.
#![deny(rustdoc::all)]
#![allow(rustdoc::missing_doc_code_examples)]
#![deny(clippy::unwrap_used)]

use anchor_lang::prelude::*;
use vipers::Validate;

mod instructions;
mod macros;
mod state;

pub use state::*;

use instructions::*;

declare_id!("GaugesLJrnVjNNWLReiw3Q7xQhycSBRgeHGTMDUaX231");

/// The [gauge] program.
#[program]
pub mod gauge {

    use super::*;

    /// Creates a [Gaugemeister].
    #[access_control(ctx.accounts.validate())]
    pub fn create_gaugemeister(
        ctx: Context<CreateGaugemeister>,
        bump: u8,
        foreman: Pubkey,
        epoch_duration_seconds: u32,
        first_epoch_starts_at: u64,
    ) -> ProgramResult {
        create_gaugemeister::handler(
            ctx,
            bump,
            foreman,
            epoch_duration_seconds,
            first_epoch_starts_at,
        )
    }

    /// Creates a [Gauge]. Permissionless.
    #[access_control(ctx.accounts.validate())]
    pub fn create_gauge(ctx: Context<CreateGauge>, bump: u8) -> ProgramResult {
        create_gauge::handler(ctx, bump)
    }

    /// Creates a [GaugeVoter]. Permissionless.
    #[access_control(ctx.accounts.validate())]
    pub fn create_gauge_voter(ctx: Context<CreateGaugeVoter>, bump: u8) -> ProgramResult {
        create_gauge_voter::handler(ctx, bump)
    }

    /// Creates a [GaugeVote]. Permissionless.
    #[access_control(ctx.accounts.validate())]
    pub fn create_gauge_vote(ctx: Context<CreateGaugeVote>, bump: u8) -> ProgramResult {
        create_gauge_vote::handler(ctx, bump)
    }

    /// Creates an [EpochGauge]. Permissionless.
    #[access_control(ctx.accounts.validate())]
    pub fn create_epoch_gauge(
        ctx: Context<CreateEpochGauge>,
        bump: u8,
        voting_epoch: u32,
    ) -> ProgramResult {
        create_epoch_gauge::handler(ctx, bump, voting_epoch)
    }

    /// Creates an [EpochGaugeVoter]. Permissionless.
    #[access_control(ctx.accounts.validate())]
    pub fn prepare_epoch_gauge_voter(
        ctx: Context<PrepareEpochGaugeVoter>,
        bump: u8,
    ) -> ProgramResult {
        prepare_epoch_gauge_voter::handler(ctx, bump)
    }

    /// Resets an [EpochGaugeVoter]; that is, syncs the [EpochGaugeVoter]
    /// with the latest power amount only if the votes have yet to be
    /// committed. Permissionless.
    #[access_control(ctx.accounts.validate())]
    pub fn reset_epoch_gauge_voter(ctx: Context<ResetEpochGaugeVoter>) -> ProgramResult {
        reset_epoch_gauge_voter::handler(ctx)
    }

    /// Sets the vote of a [Gauge].
    #[access_control(ctx.accounts.validate())]
    pub fn gauge_set_vote(ctx: Context<GaugeSetVote>, weight: u32) -> ProgramResult {
        gauge_set_vote::handler(ctx, weight)
    }

    /// Commits the vote of a [Gauge].
    /// Anyone can call this on any voter's gauge votes.
    #[access_control(ctx.accounts.validate())]
    pub fn gauge_commit_vote(ctx: Context<GaugeCommitVote>, _vote_bump: u8) -> ProgramResult {
        gauge_commit_vote::handler(ctx)
    }

    /// Reverts a vote commitment of a [Gauge].
    /// Only the voter can call this.
    #[access_control(ctx.accounts.validate())]
    pub fn gauge_revert_vote(ctx: Context<GaugeRevertVote>) -> ProgramResult {
        gauge_revert_vote::handler(ctx)
    }

    /// Enables a [Gauge].
    #[access_control(ctx.accounts.validate())]
    pub fn gauge_enable(ctx: Context<GaugeEnable>) -> ProgramResult {
        gauge_enable::handler(ctx)
    }

    /// Disables a [Gauge].
    #[access_control(ctx.accounts.validate())]
    pub fn gauge_disable(ctx: Context<GaugeDisable>) -> ProgramResult {
        gauge_disable::handler(ctx)
    }

    /// Triggers the next epoch. Permissionless.
    #[access_control(ctx.accounts.validate())]
    pub fn trigger_next_epoch(ctx: Context<TriggerNextEpoch>) -> ProgramResult {
        trigger_next_epoch::handler(ctx)
    }

    /// Synchronizes the [quarry_mine::Quarry] with the relevant [EpochGauge]. Permissionless.
    #[access_control(ctx.accounts.validate())]
    pub fn sync_gauge(ctx: Context<SyncGauge>) -> ProgramResult {
        sync_gauge::handler(ctx)
    }

    /// Sets new parameters on the [Gaugemeister].
    /// Only the [Gaugemeister::foreman] may call this.
    #[access_control(ctx.accounts.validate())]
    pub fn set_gaugemeister_params(
        ctx: Context<SetGaugemeisterParams>,
        new_epoch_duration_seconds: u32,
        new_foreman: Pubkey,
    ) -> ProgramResult {
        set_gaugemeister_params::handler(ctx, new_epoch_duration_seconds, new_foreman)
    }
}

/// Errors.
#[error]
pub enum ErrorCode {
    #[msg("You must be the foreman to perform this action.")]
    UnauthorizedNotForeman,
    #[msg("Cannot sync gauges at the 0th epoch.")]
    GaugeEpochCannotBeZero,
    #[msg("The gauge is not set to the current epoch.")]
    GaugeWrongEpoch,
    #[msg("The start time for the next epoch has not yet been reached.")]
    NextEpochNotReached,
    #[msg("Must set all votes to 0 before changing votes.")]
    CannotVoteMustReset,
    #[msg("Cannot vote since gauge is disabled; all you may do is set weight to 0.")]
    CannotVoteGaugeDisabled,
    #[msg("You have already committed your vote to this gauge.")]
    VoteAlreadyCommitted,
    #[msg("Cannot commit votes since gauge is disabled; all you may do is set weight to 0.")]
    CannotCommitGaugeDisabled,
    #[msg("Voting on this epoch gauge is closed.")]
    EpochGaugeNotVoting,
    #[msg("Gauge voter voting weights have been modified since you started committing your votes. Please withdraw your votes and try again.")]
    WeightSeqnoChanged,
    #[msg("You may no longer modify votes for this epoch.")]
    EpochClosed,
    #[msg("You must have zero allocated power in order to reset the epoch gauge.")]
    AllocatedPowerMustBeZero,
}

//! Commits the votes for a [Gauge], requiring permission.
//! The old commitment mechanism will be deprecated.

use vipers::assert_keys_eq;

use crate::*;

/// Accounts for [gauge::gauge_commit_vote_v2].
#[derive(Accounts)]
pub struct GaugeCommitVoteV2<'info> {
    /// Common accounts.
    pub common: GaugeCommitVote<'info>,
    /// The [Escrow].
    pub escrow: Account<'info, locked_voter::Escrow>,
    /// The [Escrow::vote_delegate].
    pub vote_delegate: Signer<'info>,

    /// Funder of the [EpochGaugeVote] to create.
    #[account(mut)]
    pub payer: Signer<'info>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<GaugeCommitVoteV2>) -> ProgramResult {
    ctx.accounts.common.commit_vote()
}

impl<'info> GaugeCommitVoteV2<'info> {
    pub(crate) fn validate_without_delegate(&self) -> ProgramResult {
        self.common.validate()
    }
}

impl<'info> Validate<'info> for GaugeCommitVoteV2<'info> {
    fn validate(&self) -> ProgramResult {
        self.validate_without_delegate()?;
        assert_keys_eq!(self.escrow, self.common.gauge_voter.escrow);
        assert_keys_eq!(self.vote_delegate, self.escrow.vote_delegate);
        Ok(())
    }
}

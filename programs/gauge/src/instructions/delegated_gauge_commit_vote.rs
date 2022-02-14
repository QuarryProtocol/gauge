//! Votes for a [Gauge] using the [GaugeDelegation].

use vipers::assert_keys_eq;

use crate::*;

/// Accounts for [gauge::delegated_gauge_set_vote].
#[derive(Accounts)]
pub struct DelegatedGaugeCommitVote<'info> {
    /// Common accounts for setting gauge votes.
    /// The [GaugeCommitVoteV2::vote_delegate] is overloaded to be the [GaugeDelegation::vote_committer].
    pub common: GaugeCommitVoteV2<'info>,
    /// The [GaugeDelegation].
    pub gauge_delegation: AccountLoader<'info, GaugeDelegation>,
}

impl<'info> DelegatedGaugeCommitVote<'info> {
    fn commit_vote(&mut self) -> ProgramResult {
        self.common.commit_vote()
    }
}

pub fn handler(ctx: Context<DelegatedGaugeCommitVote>) -> ProgramResult {
    ctx.accounts.commit_vote()
}

impl<'info> Validate<'info> for DelegatedGaugeCommitVote<'info> {
    fn validate(&self) -> ProgramResult {
        let delegation = self.gauge_delegation.load()?;
        self.common.validate_without_delegate()?;
        assert_keys_eq!(self.common.gauge_voter, delegation.gauge_voter);
        assert_keys_eq!(self.common.vote_delegate, delegation.vote_committer);
        Ok(())
    }
}

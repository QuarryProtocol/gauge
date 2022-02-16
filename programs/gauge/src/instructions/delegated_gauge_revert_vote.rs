//! Votes for a [Gauge] using the [GaugeDelegation].

use vipers::assert_keys_eq;

use crate::*;

/// Accounts for [gauge::delegated_gauge_revert_vote].
#[derive(Accounts)]
pub struct DelegatedGaugeRevertVote<'info> {
    /// Common accounts for setting gauge votes.
    /// The [GaugeRevertVote::vote_delegate] is overloaded to be the [GaugeDelegation::vote_setter].
    pub common: GaugeRevertVote<'info>,
    /// The [GaugeDelegation].
    pub gauge_delegation: AccountLoader<'info, GaugeDelegation>,
}

impl<'info> DelegatedGaugeRevertVote<'info> {
    /// Sets a non-zero vote.
    fn revert_vote(&mut self) -> ProgramResult {
        self.common.revert_vote()
    }
}

pub fn handler(ctx: Context<DelegatedGaugeRevertVote>) -> ProgramResult {
    ctx.accounts.revert_vote()
}

impl<'info> Validate<'info> for DelegatedGaugeRevertVote<'info> {
    fn validate(&self) -> ProgramResult {
        let delegation = self.gauge_delegation.load()?;
        self.common.validate_without_delegate()?;
        assert_keys_eq!(self.common.gauge_voter, delegation.gauge_voter);
        assert_keys_eq!(self.common.vote_delegate, delegation.vote_setter);
        Ok(())
    }
}

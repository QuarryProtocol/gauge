//! Votes for a [Gauge] using the [GaugeDelegation].

use vipers::assert_keys_eq;

use crate::*;

/// Accounts for [gauge::delegated_gauge_set_vote].
#[derive(Accounts)]
pub struct DelegatedGaugeSetVote<'info> {
    /// Common accounts for setting gauge votes.
    /// The [GaugeSetVote::vote_delegate] is overloaded to be the [GaugeDelegation::vote_setter].
    pub common: GaugeSetVote<'info>,
    /// The [GaugeDelegation].
    pub gauge_delegation: AccountLoader<'info, GaugeDelegation>,
    /// [GaugeDelegation::vote_setter].
    pub vote_setter: Signer<'info>,
}

impl<'info> DelegatedGaugeSetVote<'info> {
    /// Sets a non-zero vote.
    fn set_vote(&mut self, weight: u32) -> ProgramResult {
        self.common.set_vote(weight)
    }
}

pub fn handler(ctx: Context<DelegatedGaugeSetVote>, weight: u32) -> ProgramResult {
    ctx.accounts.set_vote(weight)
}

impl<'info> Validate<'info> for DelegatedGaugeSetVote<'info> {
    fn validate(&self) -> ProgramResult {
        let delegation = self.gauge_delegation.load()?;
        self.common.validate_delegated()?;
        assert_keys_eq!(self.common.gauge_voter, delegation.gauge_voter);
        assert_keys_eq!(self.common.vote_delegate, delegation.vote_setter);
        Ok(())
    }
}

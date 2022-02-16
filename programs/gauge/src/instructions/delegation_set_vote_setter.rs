//! Sets the [GaugeDelegation::vote_setter].

use locked_voter::Escrow;

use crate::*;

/// Accounts for [gauge::delegation_set_vote_committer].
#[derive(Accounts)]
pub struct DelegationSetVoteSetter<'info> {
    /// The [GaugeDelegation].
    #[account(mut)]
    pub gauge_delegation: AccountLoader<'info, GaugeDelegation>,
    /// [GaugeVoter].
    pub gauge_voter: Account<'info, GaugeVoter>,
    /// The [Escrow].
    pub escrow: Account<'info, Escrow>,
    /// [Escrow::vote_delegate].
    pub escrow_vote_delegate: Signer<'info>,
    /// The new [GaugeDelegation::vote_setter].
    pub new_vote_setter: UncheckedAccount<'info>,
}

impl<'info> DelegationSetVoteSetter<'info> {
    /// Sets a non-zero vote.
    fn set_vote_setter(&self) -> ProgramResult {
        let gauge_delegation = &mut self.gauge_delegation.load_mut()?;
        gauge_delegation.vote_setter = self.new_vote_setter.key();
        Ok(())
    }
}

pub fn handler(ctx: Context<DelegationSetVoteSetter>) -> ProgramResult {
    ctx.accounts.set_vote_setter()
}

impl<'info> Validate<'info> for DelegationSetVoteSetter<'info> {
    fn validate(&self) -> ProgramResult {
        let delegation = self.gauge_delegation.load()?;
        assert_keys_eq!(self.gauge_voter, delegation.gauge_voter);
        assert_keys_eq!(self.escrow, self.gauge_voter.escrow);
        assert_keys_eq!(self.escrow_vote_delegate, self.escrow.vote_delegate);
        Ok(())
    }
}

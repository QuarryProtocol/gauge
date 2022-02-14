//! Sets the [GaugeDelegation::vote_committer].

use locked_voter::Escrow;

use crate::*;

/// Accounts for [gauge::delegation_set_vote_committer].
#[derive(Accounts)]
pub struct DelegationSetVoteCommitter<'info> {
    /// The [GaugeDelegation].
    #[account(mut)]
    pub gauge_delegation: AccountLoader<'info, GaugeDelegation>,
    /// [GaugeVoter].
    pub gauge_voter: Account<'info, GaugeVoter>,
    /// The [Escrow].
    pub escrow: Account<'info, Escrow>,
    /// [Escrow::vote_delegate].
    pub escrow_vote_delegate: Signer<'info>,
    /// The new [GaugeDelegation::vote_committer].
    pub new_vote_committer: UncheckedAccount<'info>,
}

impl<'info> DelegationSetVoteCommitter<'info> {
    /// Sets a non-zero vote.
    fn set_vote_committer(&self) -> ProgramResult {
        let gauge_delegation = &mut self.gauge_delegation.load_mut()?;
        gauge_delegation.vote_committer = self.new_vote_committer.key();
        Ok(())
    }
}

pub fn handler(ctx: Context<DelegationSetVoteCommitter>) -> ProgramResult {
    ctx.accounts.set_vote_committer()
}

impl<'info> Validate<'info> for DelegationSetVoteCommitter<'info> {
    fn validate(&self) -> ProgramResult {
        let delegation = self.gauge_delegation.load()?;
        assert_keys_eq!(self.gauge_voter, delegation.gauge_voter);
        assert_keys_eq!(self.escrow, self.gauge_voter.escrow);
        assert_keys_eq!(self.escrow_vote_delegate, self.escrow.vote_delegate);
        Ok(())
    }
}

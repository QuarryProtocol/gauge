//! Reverts a vote.

use vipers::{assert_keys_eq, invariant, unwrap_int};

use crate::*;

/// Accounts for [gauge::gauge_revert_vote].
#[derive(Accounts)]
pub struct GaugeRevertVote<'info> {
    pub gaugemeister: Account<'info, Gaugemeister>,
    pub gauge: Account<'info, Gauge>,
    pub gauge_voter: Account<'info, GaugeVoter>,
    pub gauge_vote: Account<'info, GaugeVote>,

    #[account(mut)]
    pub epoch_gauge: Account<'info, EpochGauge>,
    #[account(mut)]
    pub epoch_gauge_voter: Account<'info, EpochGaugeVoter>,

    /// The escrow.
    pub escrow: Account<'info, locked_voter::Escrow>,
    /// The vote delegate.
    pub vote_delegate: Signer<'info>,

    /// The [EpochGaugeVote] to revert.
    #[account(
        mut,
        close = payer,
    )]
    pub epoch_gauge_vote: Account<'info, EpochGaugeVote>,

    #[account(mut)]
    pub payer: Signer<'info>,
}

pub fn handler(ctx: Context<GaugeRevertVote>) -> ProgramResult {
    let epoch_gauge = &mut ctx.accounts.epoch_gauge;
    let epoch_voter = &mut ctx.accounts.epoch_gauge_voter;
    let epoch_vote = &mut ctx.accounts.epoch_gauge_vote;

    let power_subtract = epoch_vote.allocated_power;
    epoch_voter.allocated_power =
        unwrap_int!(epoch_voter.allocated_power.checked_sub(power_subtract));
    epoch_gauge.total_power = unwrap_int!(epoch_gauge.total_power.checked_sub(power_subtract));

    Ok(())
}

impl<'info> Validate<'info> for GaugeRevertVote<'info> {
    fn validate(&self) -> ProgramResult {
        assert_keys_eq!(self.gaugemeister, self.gauge.gaugemeister);
        let voting_epoch = self.gaugemeister.voting_epoch()?;
        invariant!(
            self.epoch_gauge.voting_epoch == voting_epoch,
            EpochGaugeNotVoting
        );
        invariant!(
            self.epoch_gauge_voter.voting_epoch == voting_epoch,
            EpochGaugeNotVoting
        );

        assert_keys_eq!(self.epoch_gauge.gauge, self.gauge);
        assert_keys_eq!(self.epoch_gauge_voter.gauge_voter, self.gauge_voter);

        assert_keys_eq!(self.gauge_vote.gauge_voter, self.gauge_voter);
        assert_keys_eq!(self.gauge_vote.gauge, self.gauge);

        let (epoch_gauge_vote_key, _) =
            EpochGaugeVote::find_program_address(&self.gauge_vote.key(), voting_epoch);
        assert_keys_eq!(epoch_gauge_vote_key, self.epoch_gauge_vote);

        invariant!(!self.gauge.is_disabled, CannotCommitGaugeDisabled);

        assert_keys_eq!(self.escrow, self.gauge_voter.escrow);
        assert_keys_eq!(self.vote_delegate, self.escrow.vote_delegate);

        Ok(())
    }
}

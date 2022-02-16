//! Commits the votes for a [Gauge], requiring permission.
//! The old commitment mechanism will be deprecated.

use num_traits::ToPrimitive;
use vipers::{assert_keys_eq, invariant, unwrap_int};

use crate::*;

/// Accounts for [gauge::gauge_commit_vote].
#[derive(Accounts)]
pub struct GaugeCommitVoteV2<'info> {
    /// The [Gaugemeister].
    pub gaugemeister: Account<'info, Gaugemeister>,
    /// The [Gauge].
    pub gauge: Account<'info, Gauge>,
    /// The [GaugeVoter].
    pub gauge_voter: Account<'info, GaugeVoter>,
    /// The [GaugeVote] containing the vote weights.
    pub gauge_vote: Account<'info, GaugeVote>,

    /// The [EpochGauge].
    #[account(mut)]
    pub epoch_gauge: Account<'info, EpochGauge>,
    /// The [EpochGaugeVoter].
    #[account(mut)]
    pub epoch_gauge_voter: Account<'info, EpochGaugeVoter>,

    /// The [EpochGaugeVote] to create.
    #[account(
        init,
        seeds = [
            b"EpochGaugeVote",
            gauge_vote.key().as_ref(),
            epoch_gauge_voter.voting_epoch.to_le_bytes().as_ref(),
        ],
        bump,
        payer = payer
    )]
    pub epoch_gauge_vote: Account<'info, EpochGaugeVote>,

    /// The escrow.
    pub escrow: Account<'info, locked_voter::Escrow>,
    /// The [Escrow::vote_delegate].
    pub vote_delegate: Signer<'info>,

    /// Funder of the [EpochGaugeVote] to create.
    #[account(mut)]
    pub payer: Signer<'info>,
    /// The [System] program.
    pub system_program: Program<'info, System>,
}

impl<'info> GaugeCommitVoteV2<'info> {
    fn vote_shares_for_next_epoch(&self) -> Option<u64> {
        if self.gauge_vote.weight == 0 {
            return Some(0);
        }
        let power: u64 = self.epoch_gauge_voter.voting_power;
        let total_shares = (power as u128)
            .checked_mul(self.gauge_vote.weight.into())?
            .checked_div(self.gauge_voter.total_weight.into())?
            .to_u64()?;
        msg!("power: {}, shares: {}", power, total_shares);
        Some(total_shares)
    }
}

pub fn handler(ctx: Context<GaugeCommitVoteV2>) -> ProgramResult {
    ctx.accounts.commit_vote()
}

impl<'info> GaugeCommitVoteV2<'info> {
    pub(crate) fn commit_vote(&mut self) -> ProgramResult {
        let next_vote_shares = unwrap_int!(self.vote_shares_for_next_epoch());
        // if zero vote shares, don't do anything
        if next_vote_shares == 0 {
            return Ok(());
        }

        let epoch_gauge = &mut self.epoch_gauge;
        let epoch_voter = &mut self.epoch_gauge_voter;
        let epoch_vote = &mut self.epoch_gauge_vote;

        epoch_voter.allocated_power =
            unwrap_int!(epoch_voter.allocated_power.checked_add(next_vote_shares));
        epoch_vote.allocated_power = next_vote_shares;

        epoch_gauge.total_power =
            unwrap_int!(epoch_gauge.total_power.checked_add(next_vote_shares));

        emit!(CommitGaugeVoteEvent {
            gaugemeister: self.gauge.gaugemeister,
            gauge: self.gauge.key(),
            quarry: self.gauge.quarry,
            gauge_voter_owner: self.gauge_voter.owner,
            vote_shares_for_next_epoch: next_vote_shares,
            voting_epoch: epoch_voter.voting_epoch,
            updated_allocated_power: epoch_voter.allocated_power,
            updated_total_power: epoch_gauge.total_power,
        });

        Ok(())
    }

    pub(crate) fn validate_without_delegate(&self) -> ProgramResult {
        assert_keys_eq!(self.gaugemeister, self.gauge.gaugemeister);
        assert_keys_eq!(self.gauge, self.gauge_vote.gauge);
        assert_keys_eq!(self.gauge_voter, self.gauge_vote.gauge_voter);

        assert_keys_eq!(self.epoch_gauge.gauge, self.gauge);
        assert_keys_eq!(self.epoch_gauge_voter.gauge_voter, self.gauge_voter);

        invariant!(!self.gauge.is_disabled, CannotCommitGaugeDisabled);
        invariant!(
            self.epoch_gauge_voter.weight_change_seqno == self.gauge_voter.weight_change_seqno,
            WeightSeqnoChanged
        );

        let voting_epoch = self.gaugemeister.voting_epoch()?;
        invariant!(
            self.epoch_gauge_voter.voting_epoch == voting_epoch,
            EpochGaugeNotVoting
        );

        assert_keys_eq!(self.escrow, self.gauge_voter.escrow);

        Ok(())
    }
}

impl<'info> Validate<'info> for GaugeCommitVoteV2<'info> {
    fn validate(&self) -> ProgramResult {
        self.validate_without_delegate()?;
        assert_keys_eq!(self.vote_delegate, self.escrow.vote_delegate);
        Ok(())
    }
}

//! Votes for a [Gauge].

use vipers::{assert_keys_eq, invariant, unwrap_int};

use crate::*;

/// Accounts for [gauge::gauge_set_vote].
#[derive(Accounts)]
pub struct GaugeSetVote<'info> {
    /// The [Gaugemeister].
    pub gaugemeister: Account<'info, Gaugemeister>,
    /// The [Gauge].
    pub gauge: Account<'info, Gauge>,

    /// The [GaugeVoter].
    #[account(mut)]
    pub gauge_voter: Account<'info, GaugeVoter>,
    /// The [GaugeVote].
    #[account(mut)]
    pub gauge_vote: Account<'info, GaugeVote>,

    /// The escrow.
    pub escrow: Account<'info, locked_voter::Escrow>,
    /// The vote delegate.
    pub vote_delegate: Signer<'info>,
}

impl<'info> GaugeSetVote<'info> {
    fn next_total_weight(&self, new_weight: u32) -> Option<u32> {
        let total_weight = self
            .gauge_voter
            .total_weight
            .checked_sub(self.gauge_vote.weight)?
            .checked_add(new_weight)?;
        Some(total_weight)
    }

    /// Sets a non-zero vote.
    pub(crate) fn set_vote(&mut self, weight: u32) -> ProgramResult {
        if weight != 0 {
            invariant!(!self.gauge.is_disabled, CannotVoteGaugeDisabled);
        }

        if self.gauge_vote.weight == weight {
            // Don't do anything if the weight is not changed.
            return Ok(());
        }

        let next_total_weight = unwrap_int!(self.next_total_weight(weight));

        let voter = &mut self.gauge_voter;
        let vote = &mut self.gauge_vote;

        // update voter
        let prev_total_weight = voter.total_weight;
        voter.total_weight = next_total_weight;

        // record that the weights have changed.
        voter.weight_change_seqno = unwrap_int!(voter.weight_change_seqno.checked_add(1));

        // update vote
        vote.weight = weight;

        emit!(SetGaugeVoteEvent {
            gaugemeister: self.gaugemeister.key(),
            gauge: self.gauge.key(),
            quarry: self.gauge.quarry,
            gauge_voter_owner: voter.owner,
            vote_delegate: self.vote_delegate.key(),
            prev_total_weight,
            total_weight: voter.total_weight,
            weight_change_seqno: voter.weight_change_seqno,
        });

        Ok(())
    }
}

pub fn handler(ctx: Context<GaugeSetVote>, weight: u32) -> ProgramResult {
    ctx.accounts.set_vote(weight)
}

impl<'info> GaugeSetVote<'info> {
    pub(crate) fn validate_without_delegate(&self) -> ProgramResult {
        assert_keys_eq!(self.gaugemeister, self.gauge.gaugemeister);
        assert_keys_eq!(self.gauge, self.gauge_vote.gauge);
        assert_keys_eq!(self.gauge_voter, self.gauge_vote.gauge_voter);

        assert_keys_eq!(self.escrow, self.gauge_voter.escrow);
        Ok(())
    }
}

impl<'info> Validate<'info> for GaugeSetVote<'info> {
    fn validate(&self) -> ProgramResult {
        self.validate_without_delegate()?;
        assert_keys_eq!(self.vote_delegate, self.escrow.vote_delegate);
        Ok(())
    }
}

/// Event called in [gauge::gauge_set_vote].
#[event]
pub struct SetGaugeVoteEvent {
    #[index]
    /// The [Gaugemeister].
    pub gaugemeister: Pubkey,
    #[index]
    /// The [Gauge].
    pub gauge: Pubkey,
    #[index]
    /// The [quarry_mine::Quarry] being voted on.
    pub quarry: Pubkey,
    #[index]
    /// Owner of the Escrow of the [GaugeVoter].
    pub gauge_voter_owner: Pubkey,
    #[index]
    pub vote_delegate: Pubkey,
    pub prev_total_weight: u32,
    pub total_weight: u32,
    pub weight_change_seqno: u64,
}

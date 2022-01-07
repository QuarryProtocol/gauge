//! Creates a [GaugeVote].

use vipers::assert_keys_eq;

use crate::*;

/// Accounts for [gauge::create_gauge_vote].
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CreateGaugeVote<'info> {
    /// The [GaugeVote] to be created.
    #[account(
        init,
        seeds = [
            b"GaugeVote".as_ref(),
            gauge_voter.key().as_ref(),
            gauge.key().as_ref(),
        ],
        bump = bump,
        payer = payer
    )]
    pub gauge_vote: Account<'info, GaugeVote>,

    /// Gauge voter.
    pub gauge_voter: Account<'info, GaugeVoter>,

    /// Gauge.
    pub gauge: Account<'info, Gauge>,

    /// Payer.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program.
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateGaugeVote>, _bump: u8) -> ProgramResult {
    let gauge_vote = &mut ctx.accounts.gauge_vote;
    gauge_vote.gauge_voter = ctx.accounts.gauge_voter.key();
    gauge_vote.gauge = ctx.accounts.gauge.key();

    gauge_vote.weight = 0;
    gauge_vote.weight_change_seqno = ctx.accounts.gauge_voter.weight_change_seqno;

    emit!(GaugeVoteCreateEvent {
        gaugemeister: ctx.accounts.gauge.gaugemeister,
        quarry: ctx.accounts.gauge.quarry,
        gauge_voter_owner: ctx.accounts.gauge_voter.owner,
        weight_change_seqno: gauge_vote.weight_change_seqno,
    });

    Ok(())
}

impl<'info> Validate<'info> for CreateGaugeVote<'info> {
    fn validate(&self) -> ProgramResult {
        assert_keys_eq!(self.gauge_voter.gaugemeister, self.gauge.gaugemeister);
        Ok(())
    }
}

/// Event called in [gauge::create_gauge_vote].
#[event]
pub struct GaugeVoteCreateEvent {
    #[index]
    /// The [Gaugemeister].
    pub gaugemeister: Pubkey,
    #[index]
    /// The [quarry_mine::Quarry] being voted on.
    pub quarry: Pubkey,
    #[index]
    /// Owner of the Escrow of the [GaugeVoter].
    pub gauge_voter_owner: Pubkey,
    /// The [GaugeVoter::weight_change_seqno] at the time of creating the [GaugeVote].
    pub weight_change_seqno: u64,
}

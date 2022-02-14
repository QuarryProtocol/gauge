//! Creates a [GaugeDelegation].

use locked_voter::Escrow;
use vipers::assert_keys_eq;

use crate::*;

/// Accounts for [gauge::create_gauge_delegation].
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CreateGaugeDelegation<'info> {
    /// The [Gauge] to be created.
    #[account(
        init,
        seeds = [
            b"GaugeDelegation".as_ref(),
            gauge_voter.key().as_ref(),
        ],
        bump = bump,
        payer = payer
    )]
    pub gauge_delegation: AccountLoader<'info, GaugeDelegation>,

    /// [GaugeVoter].
    pub gauge_voter: Account<'info, GaugeVoter>,

    /// [Escrow].
    pub escrow: Account<'info, Escrow>,

    /// Payer.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program.
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateGaugeDelegation>) -> ProgramResult {
    let gauge_delegation = &mut ctx.accounts.gauge_delegation.load_init()?;
    gauge_delegation.gauge_voter = ctx.accounts.gauge_voter.key();
    gauge_delegation.vote_setter = Pubkey::default();
    gauge_delegation.vote_committer = Pubkey::default();
    Ok(())
}

impl<'info> Validate<'info> for CreateGaugeDelegation<'info> {
    fn validate(&self) -> ProgramResult {
        assert_keys_eq!(self.escrow, self.gauge_voter.escrow);
        Ok(())
    }
}

//! Creates the [Gaugemeister].

use num_traits::ToPrimitive;
use vipers::{invariant, unwrap_int};

use crate::*;

/// Accounts for [gauge::create_gaugemeister].
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CreateGaugemeister<'info> {
    /// The [Gaugemeister] to be created.
    #[account(
        init,
        seeds = [
            b"Gaugemeister".as_ref(),
            base.key().as_ref(),
        ],
        bump = bump,
        payer = payer
    )]
    pub gaugemeister: Account<'info, Gaugemeister>,

    /// Base.
    pub base: Signer<'info>,

    /// The Quarry [quarry_operator::Operator].
    pub operator: Account<'info, quarry_operator::Operator>,

    /// [locked_voter::Locker] which determines gauge weights.
    pub locker: Account<'info, locked_voter::Locker>,

    /// Payer.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program.
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateGaugemeister>,
    bump: u8,
    foreman: Pubkey,
    epoch_duration_seconds: u32,
    first_epoch_starts_at: u64,
) -> ProgramResult {
    let now = unwrap_int!(Clock::get()?.unix_timestamp.to_u64());
    invariant!(
        now <= first_epoch_starts_at,
        "first epoch must be in the future"
    );

    let gaugemeister = &mut ctx.accounts.gaugemeister;

    gaugemeister.base = ctx.accounts.base.key();
    gaugemeister.bump = bump;

    gaugemeister.rewarder = ctx.accounts.operator.rewarder;
    gaugemeister.operator = ctx.accounts.operator.key();
    gaugemeister.locker = ctx.accounts.locker.key();

    gaugemeister.foreman = foreman;
    gaugemeister.epoch_duration_seconds = epoch_duration_seconds;

    gaugemeister.current_rewards_epoch = 0;
    gaugemeister.next_epoch_starts_at = first_epoch_starts_at;

    gaugemeister.locker_token_mint = ctx.accounts.locker.token_mint;
    gaugemeister.locker_governor = ctx.accounts.locker.governor;

    Ok(())
}

impl<'info> Validate<'info> for CreateGaugemeister<'info> {
    fn validate(&self) -> ProgramResult {
        Ok(())
    }
}

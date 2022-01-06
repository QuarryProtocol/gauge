//! Creates an [EpochGauge].

use crate::*;

/// Accounts for [gauge::create_epoch_gauge].
#[derive(Accounts)]
#[instruction(bump: u8, voting_epoch: u32)]
pub struct CreateEpochGauge<'info> {
    /// The [Gauge] to create an [EpochGauge] of.
    pub gauge: Account<'info, Gauge>,

    /// The [EpochGauge] to be created.
    #[account(
        init,
        seeds = [
            b"EpochGauge".as_ref(),
            gauge.key().as_ref(),
            voting_epoch.to_le_bytes().as_ref()
        ],
        bump = bump,
        payer = payer
    )]
    pub epoch_gauge: Account<'info, EpochGauge>,

    /// Payer.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program.
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateEpochGauge>, _bump: u8, voting_epoch: u32) -> ProgramResult {
    let epoch_gauge = &mut ctx.accounts.epoch_gauge;
    epoch_gauge.gauge = ctx.accounts.gauge.key();
    epoch_gauge.voting_epoch = voting_epoch;
    epoch_gauge.total_power = 0;
    Ok(())
}

impl<'info> Validate<'info> for CreateEpochGauge<'info> {
    fn validate(&self) -> ProgramResult {
        Ok(())
    }
}

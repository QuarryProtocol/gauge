//! Creates a [Gauge].

use vipers::assert_keys_eq;

use crate::*;

/// Accounts for [gauge::create_gauge].
#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct CreateGauge<'info> {
    /// The [Gauge] to be created.
    #[account(
        init,
        seeds = [
            b"Gauge".as_ref(),
            gaugemeister.key().as_ref(),
            quarry.key().as_ref(),
        ],
        bump = bump,
        payer = payer
    )]
    pub gauge: Account<'info, Gauge>,

    /// [Gaugemeister].
    pub gaugemeister: Account<'info, Gaugemeister>,

    /// [quarry_mine::Quarry].
    pub quarry: Account<'info, quarry_mine::Quarry>,

    /// Payer.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program.
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateGauge>, _bump: u8) -> ProgramResult {
    let gauge = &mut ctx.accounts.gauge;
    gauge.gaugemeister = ctx.accounts.gaugemeister.key();
    gauge.quarry = ctx.accounts.quarry.key();
    // Since this is permissionless, gauges are disabled when they are created.
    gauge.is_disabled = true;
    Ok(())
}

impl<'info> Validate<'info> for CreateGauge<'info> {
    fn validate(&self) -> ProgramResult {
        assert_keys_eq!(self.gaugemeister.rewarder, self.quarry.rewarder_key);
        Ok(())
    }
}

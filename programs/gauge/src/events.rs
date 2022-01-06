//! Events for the [gauge] program.

use crate::*;

/// Event called in [gauge::create_gaugemeister].
#[event]
pub struct GaugemeisterCreateEvent {
    /// The [Gaugemeister] being created.
    #[index]
    pub gaugemeister: Pubkey,
}

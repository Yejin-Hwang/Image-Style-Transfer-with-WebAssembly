use wasm_bindgen::prelude::*;
#[wasm_bindgen]
pub fn factorial(n: u32) -> u32 {
    (1..=n).product()
}

use ed25519_dalek::SigningKey;
use rand::rngs::OsRng;
use x25519_dalek::{
    PublicKey as X25519PublicKey,
    StaticSecret,
};

pub struct DeviceKeyMaterial {
    pub identity_private_key: [u8; 32],
    pub identity_public_key: [u8; 32],

    pub key_agreement_private_key: [u8; 32],
    pub key_agreement_public_key: [u8; 32],
}

pub fn generate_device_keys() -> DeviceKeyMaterial {
    let mut rng = OsRng;

    let identity_signing_key =
        SigningKey::generate(&mut rng);

    let identity_private_key =
        identity_signing_key.to_bytes();

    let identity_public_key =
        identity_signing_key
            .verifying_key()
            .to_bytes();

    let key_agreement_private =
        StaticSecret::random_from_rng(&mut rng);

    let key_agreement_public =
        X25519PublicKey::from(
            &key_agreement_private,
        );

    DeviceKeyMaterial {
        identity_private_key,
        identity_public_key,

        key_agreement_private_key:
            key_agreement_private.to_bytes(),

        key_agreement_public_key:
            *key_agreement_public.as_bytes(),
    }
}

pub fn derive_identity_public_key(
    private_key: &[u8; 32],
) -> [u8; 32] {
    let signing_key =
        SigningKey::from_bytes(private_key);

    signing_key
        .verifying_key()
        .to_bytes()
}

pub fn derive_key_agreement_public_key(
    private_key: &[u8; 32],
) -> [u8; 32] {
    let private_key =
        StaticSecret::from(*private_key);

    let public_key =
        X25519PublicKey::from(&private_key);

    *public_key.as_bytes()
}
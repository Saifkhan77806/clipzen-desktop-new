use aes_gcm::{
    aead::{generic_array::GenericArray, Aead, KeyInit},
    Aes256Gcm,
};
use base64::Engine;
use ed25519_dalek::SigningKey;
use hkdf::Hkdf;
use rand::rngs::OsRng;
use sha2::Sha256;
use x25519_dalek::{PublicKey as X25519PublicKey, StaticSecret};

const INFO: &[u8] = b"CLIPZEN clipboard encryption v1";

pub struct DeviceKeyMaterial {
    pub identity_private_key: [u8; 32],
    pub identity_public_key: [u8; 32],

    pub key_agreement_private_key: [u8; 32],
    pub key_agreement_public_key: [u8; 32],
}

pub fn generate_device_keys() -> DeviceKeyMaterial {
    let mut rng = OsRng;

    let identity_signing_key = SigningKey::generate(&mut rng);

    let identity_private_key = identity_signing_key.to_bytes();

    let identity_public_key = identity_signing_key.verifying_key().to_bytes();

    let key_agreement_private = StaticSecret::random_from_rng(&mut rng);

    let key_agreement_public = X25519PublicKey::from(&key_agreement_private);

    DeviceKeyMaterial {
        identity_private_key,
        identity_public_key,

        key_agreement_private_key: key_agreement_private.to_bytes(),

        key_agreement_public_key: *key_agreement_public.as_bytes(),
    }
}

pub fn derive_identity_public_key(private_key: &[u8; 32]) -> [u8; 32] {
    let signing_key = SigningKey::from_bytes(private_key);

    signing_key.verifying_key().to_bytes()
}

pub fn derive_key_agreement_public_key(private_key: &[u8; 32]) -> [u8; 32] {
    let private_key = StaticSecret::from(*private_key);

    let public_key = X25519PublicKey::from(&private_key);

    *public_key.as_bytes()
}

pub fn decrypt_clipboard(
    ciphertext_base64: &str,
    nonce_base64: &str,
    authentication_tag_base64: &str,
    private_key: &[u8; 32],
) -> Result<String, String> {
    let envelope = base64::engine::general_purpose::STANDARD
        .decode(ciphertext_base64)
        .map_err(|error| format!("Invalid ciphertext base64: {}", error))?;

    let nonce = base64::engine::general_purpose::STANDARD
        .decode(nonce_base64)
        .map_err(|error| format!("Invalid nonce base64: {}", error))?;

    let authentication_tag = base64::engine::general_purpose::STANDARD
        .decode(authentication_tag_base64)
        .map_err(|error| format!("Invalid authentication tag base64: {}", error))?;

    if nonce.len() != 12 {
        return Err("Invalid AES-GCM nonce length".to_string());
    }

    if authentication_tag.len() != 16 {
        return Err("Invalid AES-GCM authentication tag length".to_string());
    }

    if envelope.len() < 32 {
        return Err("Invalid encrypted clipboard envelope".to_string());
    }

    let ephemeral_public_key = X25519PublicKey::from(
        <[u8; 32]>::try_from(&envelope[..32])
            .map_err(|_| "Invalid ephemeral public key".to_string())?,
    );

    let ciphertext = &envelope[32..];

    let private_key = StaticSecret::from(*private_key);

    let shared_secret = private_key.diffie_hellman(&ephemeral_public_key);

    let hkdf = Hkdf::<Sha256>::new(None, shared_secret.as_bytes());

    let mut encryption_key = [0u8; 32];

    hkdf.expand(INFO, &mut encryption_key)
        .map_err(|_| "Failed to derive clipboard encryption key".to_string())?;

    let cipher = Aes256Gcm::new(GenericArray::from_slice(&encryption_key));

    /*
     * The Web Crypto AES-GCM implementation used by
     * the backend returns:
     *
     * ciphertext || authenticationTag
     *
     * Therefore Rust must reconstruct that same
     * combined AES-GCM payload.
     */
    let mut encrypted = Vec::with_capacity(ciphertext.len() + authentication_tag.len());

    encrypted.extend_from_slice(ciphertext);
    encrypted.extend_from_slice(&authentication_tag);

    let plaintext = cipher
        .decrypt(GenericArray::from_slice(&nonce), encrypted.as_ref())
        .map_err(|_| "Clipboard decryption failed".to_string())?;

    String::from_utf8(plaintext)
        .map_err(|error| format!("Clipboard plaintext is not valid UTF-8: {}", error))
}

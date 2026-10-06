use keyring::Entry;

const SERVICE_NAME: &str = "CLIPZEN";

const DEVICE_ID: &str =
    "device-id";

const IDENTITY_PRIVATE_KEY: &str =
    "identity-private-key";

const KEY_AGREEMENT_PRIVATE_KEY: &str =
    "key-agreement-private-key";

fn entry(name: &str) -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, name)
        .map_err(|error| error.to_string())
}


/*
 * DEVICE ID
 */

pub fn load_or_create_device_id()
    -> Result<String, String>
{
    let entry = entry(DEVICE_ID)?;

    match entry.get_password() {
        Ok(device_id) => {
            Ok(device_id)
        }

        Err(_) => {
            let device_id =
                uuid::Uuid::new_v4().to_string();

            entry
                .set_password(&device_id)
                .map_err(|error| error.to_string())?;

            Ok(device_id)
        }
    }
}


/*
 * ED25519 PRIVATE KEY
 */

pub fn store_identity_private_key(
    key: &[u8; 32],
) -> Result<(), String> {
    let entry =
        entry(IDENTITY_PRIVATE_KEY)?;

    entry
        .set_secret(key)
        .map_err(|error| error.to_string())
}

pub fn load_identity_private_key()
    -> Result<[u8; 32], String>
{
    let entry =
        entry(IDENTITY_PRIVATE_KEY)?;

    let secret =
        entry
            .get_secret()
            .map_err(|error| error.to_string())?;

    if secret.len() != 32 {
        return Err(
            "Invalid Ed25519 private key length"
                .to_string(),
        );
    }

    let mut key = [0u8; 32];

    key.copy_from_slice(&secret);

    Ok(key)
}


/*
 * X25519 PRIVATE KEY
 */

pub fn store_key_agreement_private_key(
    key: &[u8; 32],
) -> Result<(), String> {
    let entry =
        entry(KEY_AGREEMENT_PRIVATE_KEY)?;

    entry
        .set_secret(key)
        .map_err(|error| error.to_string())
}

pub fn load_key_agreement_private_key()
    -> Result<[u8; 32], String>
{
    let entry =
        entry(KEY_AGREEMENT_PRIVATE_KEY)?;

    let secret =
        entry
            .get_secret()
            .map_err(|error| error.to_string())?;

    if secret.len() != 32 {
        return Err(
            "Invalid X25519 private key length"
                .to_string(),
        );
    }

    let mut key = [0u8; 32];

    key.copy_from_slice(&secret);

    Ok(key)
}


/*
 * DEVICE CRYPTOGRAPHIC KEYS
 */

pub fn load_or_create_device_keys(
) -> Result<
    crate::crypto::DeviceKeyMaterial,
    String,
> {
    let identity_private =
        match load_identity_private_key() {
            Ok(key) => key,

            Err(_) => {
                let keys =
                    crate::crypto::generate_device_keys();

                store_identity_private_key(
                    &keys.identity_private_key,
                )?;

                store_key_agreement_private_key(
                    &keys.key_agreement_private_key,
                )?;

                return Ok(keys);
            }
        };

    let key_agreement_private =
        load_key_agreement_private_key()?;

    let identity_public =
        crate::crypto::derive_identity_public_key(
            &identity_private,
        );

    let key_agreement_public =
        crate::crypto::derive_key_agreement_public_key(
            &key_agreement_private,
        );

    Ok(
        crate::crypto::DeviceKeyMaterial {
            identity_private_key:
                identity_private,

            identity_public_key:
                identity_public,

            key_agreement_private_key:
                key_agreement_private,

            key_agreement_public_key:
                key_agreement_public,
        },
    )
}
export type DevicePlatform = "android" | "windows" | "macos" | "linux" | "ios";

export type Device = {
  id: string;
  deviceName: string;
  platform: DevicePlatform;
  status: "active" | "revoked";
  lastSeenAt: string | null;
  connectionStatus: "online" | "offline";
};

type DevicesResponse = {
  devices: Device[];
};

export async function getDevices(accessToken: string): Promise<Device[]> {
  const response = await fetch("http://172.16.1.139:8080/v1/devices", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Failed to load devices (${response.status}): ${body}`);
  }

  const data = (await response.json()) as DevicesResponse;

  return data.devices;
}

export type CreatePairingResponse = {
  paired: boolean;
  pairingToken: string;
  expiresAt: string;
  device: {
    deviceId: string;
    deviceName: string;
    platform: string;
  };
};

export async function createPairing(
  accessToken: string,
  deviceId: string,
): Promise<CreatePairingResponse> {
  const response = await fetch("http://172.16.1.139:8080/v1/pairing/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ deviceId }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to create pairing request (${response.status}): ${body}`,
    );
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("pairingToken" in data) ||
    typeof data.pairingToken !== "string" ||
    !("expiresAt" in data) ||
    typeof data.expiresAt !== "string" ||
    !("device" in data) ||
    typeof data.device !== "object" ||
    data.device === null
  ) {
    throw new Error("The server returned an invalid pairing response.");
  }

  return data as CreatePairingResponse;
}

export async function acceptPairing(
  accessToken: string,
  deviceId: string,
  pairingToken: string,
): Promise<void> {
  const response = await fetch("http://172.16.1.139:8080/v1/pairing/accept", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      deviceId,
      pairingToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Failed to pair device (${response.status}): ${body}`);
  }
}

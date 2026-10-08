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

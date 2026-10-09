export type ClipboardDeliveryStatus =
  | "pending"
  | "sent"
  | "received"
  | "accepted"
  | "applied"
  | "declined"
  | "failed"
  | "cancelled";

export type ClipboardStatusResponse = {
  clipboardItemId: string;
  status: ClipboardDeliveryStatus;
};

export type SendClipboardResponse = {
  sent: boolean;
  clipboardItemId: string;
  sourceDevice: {
    deviceId: string;
    deviceName: string;
    platform: string;
  };
  deliverySummary: {
    total: number;
    sent: number;
    pending: number;
  };
  deliveries: Array<{
    deliveryId: string;
    clipboardItemId: string;
    targetDeviceId: string;
    targetDeviceName: string;
    platform: string;
    status: ClipboardDeliveryStatus;
    createdAt: string;
  }>;
};

export async function sendClipboard(
  accessToken: string,
  deviceId: string,
  text: string,
): Promise<SendClipboardResponse> {
  const response = await fetch("http://172.16.1.139:8080/v1/clipboard/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      deviceId,
      targetDeviceIds: [],
      sendToAll: true,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Failed to send clipboard (${response.status}): ${body}`);
  }

  return (await response.json()) as SendClipboardResponse;
}

export async function getClipboardStatus(
  accessToken: string,
  clipboardItemId: string,
): Promise<ClipboardStatusResponse> {
  const response = await fetch(
    `http://172.16.1.139:8080/v1/clipboard/${clipboardItemId}/status`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Failed to load clipboard status (${response.status}): ${body}`,
    );
  }

  return (await response.json()) as ClipboardStatusResponse;
}

export async function acceptClipboardDelivery(
  accessToken: string,
  deliveryId: string,
): Promise<void> {
  const response = await fetch(
    `http://172.16.1.139:8080/v1/clipboard/deliveries/${deliveryId}/accept`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Failed to accept clipboard delivery (${response.status}): ${body}`,
    );
  }
}

export async function declineClipboardDelivery(
  accessToken: string,
  deliveryId: string,
): Promise<void> {
  const response = await fetch(
    `http://172.16.1.139:8080/v1/clipboard/deliveries/${deliveryId}/decline`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Failed to decline clipboard delivery (${response.status}): ${body}`,
    );
  }
}

export async function markClipboardDeliveryApplied(
  accessToken: string,
  deliveryId: string,
): Promise<void> {
  const response = await fetch(
    `http://172.16.1.139:8080/v1/clipboard/deliveries/${deliveryId}/applied`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Failed to mark clipboard delivery applied (${response.status}): ${body}`,
    );
  }
}

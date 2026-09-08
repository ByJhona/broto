export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  categoryId?: string;
};

type ExpoPushTicket = { status: string; details?: { error?: string } };

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_CHUNK_SIZE = 100;

export async function sendExpoPushNotifications(
  messages: ExpoPushMessage[]
): Promise<{ deliveredTokens: string[]; staleTokens: string[] }> {
  const deliveredTokens: string[] = [];
  const staleTokens: string[] = [];

  for (let i = 0; i < messages.length; i += EXPO_PUSH_CHUNK_SIZE) {
    const chunk = messages.slice(i, i + EXPO_PUSH_CHUNK_SIZE);

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk),
    });

    if (!response.ok) {
      console.error('Erro chamando a Expo Push API:', response.status, await response.text());
      continue;
    }

    const result = await response.json();
    const tickets = (result.data ?? []) as ExpoPushTicket[];

    chunk.forEach((message, index) => {
      const ticket = tickets[index];
      if (ticket?.status === 'error') {
        if (ticket.details?.error === 'DeviceNotRegistered') {
          staleTokens.push(message.to);
        }
        return;
      }
      deliveredTokens.push(message.to);
    });
  }

  return { deliveredTokens, staleTokens };
}

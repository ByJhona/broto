let activeChatUserId: string | null = null;

export function setActiveChatUser(userId: string | null): void {
  activeChatUserId = userId;
}

export function isActiveChatPush(data: Record<string, unknown> | undefined): boolean {
  return !!activeChatUserId && data?.chatUserId === activeChatUserId;
}

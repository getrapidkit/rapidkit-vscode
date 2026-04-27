export function getConversationIdToCloseOnBootstrap(
  currentConversationId: string | null,
  nextConversationId: string
): string | null {
  if (!currentConversationId || currentConversationId === nextConversationId) {
    return null;
  }

  return currentConversationId;
}

export function getConversationIdToCloseOnViewExit(
  activeView: 'dashboard' | 'incident-studio',
  conversationId: string | null
): string | null {
  if (activeView === 'incident-studio' || !conversationId) {
    return null;
  }

  return conversationId;
}

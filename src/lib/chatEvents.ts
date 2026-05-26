export const ASSISTANT_CHAT_EVENT = 'antonio:open-assistant-chat';

export interface AssistantChatEventDetail {
  draft?: string;
  autoSend?: boolean;
}

export const openAssistantChat = (draft?: string, autoSend = false) => {
  window.dispatchEvent(
    new CustomEvent<AssistantChatEventDetail>(ASSISTANT_CHAT_EVENT, {
      detail: { draft, autoSend },
    }),
  );
};

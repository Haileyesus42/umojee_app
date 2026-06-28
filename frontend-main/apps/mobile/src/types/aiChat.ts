export type AIChatSource = 'assistant_overlay' | 'aichat_screen' | 'new_chat' | 'history';

export type AIChatLaunchParams = {
  conversationId?: string;
  initialPrompt?: string;
  quickActionGroup?: string;
  quickActionId?: string;
  quickActionLabel?: string;
  source?: AIChatSource;
};

export type AIChatMetadata = {
  quick_action_group?: string;
  quick_action_id?: string;
  quick_action_label?: string;
  routing_hint?: string;
  source: 'assistant_overlay' | 'aichat_screen';
};

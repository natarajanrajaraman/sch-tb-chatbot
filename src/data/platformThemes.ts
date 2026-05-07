export type PlatformType = 'messenger' | 'telegram' | 'viber' | 'web';

export interface PlatformTheme {
  id: PlatformType;
  name: string;
  headerBg: string;
  headerText: string;
  userBubbleBg: string;
  userBubbleText: string;
  botBubbleBg: string;
  botBubbleText: string;
  buttonBg: string;
  buttonText: string;
  buttonBorder: string;
  inputBg: string;
  chatBg: string;
  fontFamily: string;
  borderRadius: string;
  avatarIcon: string;
  headerIcon: string;
  sendButtonColor: string;
}

export const PLATFORM_THEMES: Record<PlatformType, PlatformTheme> = {
  messenger: {
    id: 'messenger',
    name: 'Facebook Messenger',
    headerBg: '#0084ff',
    headerText: '#ffffff',
    userBubbleBg: '#0084ff',
    userBubbleText: '#ffffff',
    botBubbleBg: '#e4e6eb',
    botBubbleText: '#050505',
    buttonBg: '#ffffff',
    buttonText: '#0084ff',
    buttonBorder: '#0084ff',
    inputBg: '#f0f2f5',
    chatBg: '#ffffff',
    fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
    borderRadius: '18px',
    avatarIcon: '💬',
    headerIcon: '⚡',
    sendButtonColor: '#0084ff',
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    headerBg: '#517da2',
    headerText: '#ffffff',
    userBubbleBg: '#effdde',
    userBubbleText: '#000000',
    botBubbleBg: '#ffffff',
    botBubbleText: '#000000',
    buttonBg: '#ffffff',
    buttonText: '#3390ec',
    buttonBorder: '#3390ec',
    inputBg: '#ffffff',
    chatBg: '#c8d9e6',
    fontFamily: 'system-ui, -apple-system, Roboto, sans-serif',
    borderRadius: '12px',
    avatarIcon: '🤖',
    headerIcon: '✈️',
    sendButtonColor: '#3390ec',
  },
  viber: {
    id: 'viber',
    name: 'Viber',
    headerBg: '#7360f2',
    headerText: '#ffffff',
    userBubbleBg: '#7360f2',
    userBubbleText: '#ffffff',
    botBubbleBg: '#f1f0f0',
    botBubbleText: '#1d1d1d',
    buttonBg: '#ffffff',
    buttonText: '#7360f2',
    buttonBorder: '#7360f2',
    inputBg: '#f7f7f7',
    chatBg: '#e5ddd5',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    borderRadius: '20px',
    avatarIcon: '📱',
    headerIcon: '📞',
    sendButtonColor: '#7360f2',
  },
  web: {
    id: 'web',
    name: 'Web Chat',
    headerBg: '#1a1a2e',
    headerText: '#ffffff',
    userBubbleBg: '#16213e',
    userBubbleText: '#ffffff',
    botBubbleBg: '#f0f0f0',
    botBubbleText: '#1a1a2e',
    buttonBg: '#ffffff',
    buttonText: '#1a1a2e',
    buttonBorder: '#1a1a2e',
    inputBg: '#f5f5f5',
    chatBg: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '12px',
    avatarIcon: '🏥',
    headerIcon: '🌐',
    sendButtonColor: '#1a1a2e',
  },
};

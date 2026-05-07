export type PlatformType = 'messenger' | 'telegram' | 'viber' | 'web';

export interface PlatformTheme {
  id: PlatformType;
  name: string;
  // Colors
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
  sendButtonColor: string;
  // Typography
  fontFamily: string;
  fontSize: string;
  // Shape
  borderRadius: string;
  buttonRadius: string;
  inputRadius: string;
  // Layout
  frameWidth: string;
  frameHeight: string;
  headerPadding: string;
  messagePadding: string;
  messageGap: string;
  avatarSize: string;    // '0' = hidden
  showTimestamp: boolean;
  // Icons
  avatarIcon: string;
  headerIcon: string;
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
    sendButtonColor: '#0084ff',
    fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
    fontSize: '14px',
    borderRadius: '18px',
    buttonRadius: '20px',
    inputRadius: '20px',
    frameWidth: '380px',
    frameHeight: '680px',
    headerPadding: '10px 16px',
    messagePadding: '8px 12px',
    messageGap: '2px',
    avatarSize: '28px',
    showTimestamp: false,
    avatarIcon: '\u{1F4AC}',
    headerIcon: '\u{26A1}',
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
    sendButtonColor: '#3390ec',
    fontFamily: 'system-ui, -apple-system, Roboto, sans-serif',
    fontSize: '15px',
    borderRadius: '12px',
    buttonRadius: '8px',
    inputRadius: '12px',
    frameWidth: '420px',
    frameHeight: '700px',
    headerPadding: '12px 16px',
    messagePadding: '8px 14px',
    messageGap: '4px',
    avatarSize: '32px',
    showTimestamp: true,
    avatarIcon: '\u{1F916}',
    headerIcon: '\u{2708}\u{FE0F}',
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
    sendButtonColor: '#7360f2',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    borderRadius: '20px',
    buttonRadius: '22px',
    inputRadius: '22px',
    frameWidth: '380px',
    frameHeight: '680px',
    headerPadding: '8px 14px',
    messagePadding: '8px 12px',
    messageGap: '2px',
    avatarSize: '0',
    showTimestamp: false,
    avatarIcon: '\u{1F4F1}',
    headerIcon: '\u{1F4DE}',
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
    sendButtonColor: '#1a1a2e',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    borderRadius: '12px',
    buttonRadius: '8px',
    inputRadius: '8px',
    frameWidth: '440px',
    frameHeight: '640px',
    headerPadding: '14px 16px',
    messagePadding: '10px 16px',
    messageGap: '8px',
    avatarSize: '36px',
    showTimestamp: true,
    avatarIcon: '\u{1F3E5}',
    headerIcon: '\u{1F310}',
  },
};

export const PLATFORM_ORDER: PlatformType[] = ['web', 'messenger', 'telegram', 'viber'];

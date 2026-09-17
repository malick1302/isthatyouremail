export type SoftrSiteConfig = {
  id: string;
  label: string;
  url: string;
  color: string;
  softrDomain?: string;
};

export type BaseConfig = {
  id: string;
  label: string;
  baseId: string;
  table: string;
  emailField: string;
  color: string;
  gmailAlias: string;
  softrSiteId?: string;
  dateField?: string;
  gazetteOptOutField?: string;
  coursOptOutField?: string;
  enabled?: boolean;
};

export type BaseMatch = {
  id: string;
  label: string;
  color: string;
  gmailAlias: string;
  recordId?: string;
  baseId: string;
};

export type InboxMessage = {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  fromEmail: string;
  to: string;
  toName: string;
  toEmail: string;
  subject: string;
  snippet: string;
  date: string;
  dateLabel: string;
  matches: BaseMatch[];
  unread: boolean;
};

export type ThreadMessage = {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  fromEmail: string;
  to: string;
  date: string;
  dateLabel: string;
  subject: string;
  messageIdHeader: string;
  references: string;
  text: string;
  html: string;
};

export type SendAsAlias = {
  email: string;
  name: string;
  isPrimary: boolean;
  isDefault: boolean;
};

export type FolderOption = {
  name: string;
};

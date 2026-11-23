import { messagesFor } from '@ai-support/shared/messages';

export function widgetCopy(locale?: string) {
  const copy = messagesFor(locale);
  return {
    ...copy,
    rateLabel: (value: number) => copy.rateLabel.replace('{value}', String(value)),
    confirmAction: (label: string) => copy.confirmAction.replace('{label}', () => label),
  };
}

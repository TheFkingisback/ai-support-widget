const english = {
  support: 'Support', chat: 'Support chat', open: 'Open support chat', minimize: 'Minimize support chat',
  end: 'End Session', endLabel: 'End support session', messages: 'Chat messages', composer: 'Send a message',
  placeholder: 'Describe your issue...', messageLabel: 'Type your message', send: 'Send', sendLabel: 'Send message',
  thinking: 'AI is thinking...', sendFailed: 'Failed to send message. Please try again.',
  responseFailed: 'Failed to get response. Please try again.', unavailable: 'Support unavailable. Try again.',
  resolved: 'Was your issue resolved?', yes: 'Yes', no: 'No', resolvedLabel: 'Issue was resolved', unresolvedLabel: 'Issue was not resolved',
  rating: 'How would you rate this experience? (1-10)', rateLabel: (value: number) => `Rate ${value} out of 10`,
  skipRating: 'Close without rating', closing: 'Closing case...', closed: 'Case closed.',
  closeFailed: 'Failed to close case. Please try again.', retry: 'Retry', copy: 'Copy',
  cancel: 'Cancel', confirm: 'Confirm', confirmAction: (label: string) => `Are you sure you want to "${label}"?`,
  actionFailed: 'This action is unavailable. Use your application’s human support channel.',
  humanHelp: 'Contact support',
};

const brazilian: typeof english = {
  support: 'Suporte', chat: 'Chat de suporte', open: 'Abrir chat de suporte', minimize: 'Minimizar chat de suporte',
  end: 'Encerrar conversa', endLabel: 'Encerrar conversa de suporte', messages: 'Mensagens do chat', composer: 'Enviar mensagem',
  placeholder: 'Descreva seu problema…', messageLabel: 'Digite sua mensagem', send: 'Enviar', sendLabel: 'Enviar mensagem',
  thinking: 'A IA está preparando uma resposta…', sendFailed: 'Não foi possível enviar. Tente novamente.',
  responseFailed: 'Não foi possível obter uma resposta. Tente novamente.', unavailable: 'Suporte indisponível. Tente novamente.',
  resolved: 'Seu problema foi resolvido?', yes: 'Sim', no: 'Não', resolvedLabel: 'O problema foi resolvido', unresolvedLabel: 'O problema não foi resolvido',
  rating: 'Como você avalia esta experiência? (1 a 10)', rateLabel: value => `Dar nota ${value} de 10`,
  skipRating: 'Encerrar sem avaliar', closing: 'Encerrando conversa…', closed: 'Conversa encerrada.',
  closeFailed: 'Não foi possível encerrar. Tente novamente.', retry: 'Tentar novamente', copy: 'Copiar',
  cancel: 'Cancelar', confirm: 'Confirmar', confirmAction: label => `Você confirma a ação “${label}”?`,
  actionFailed: 'Esta ação está indisponível. Use o canal de atendimento humano do aplicativo.',
  humanHelp: 'Falar com o atendimento',
};

export function widgetCopy(locale = 'en-US') {
  return locale.toLowerCase().split(/[-_]/)[0] === 'pt' ? brazilian : english;
}

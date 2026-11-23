import { matchLocale, type SupportLocale } from '@ai-support/shared/locales';
import type { KnowledgeDoc } from '../../shared/types.js';

export function selectLocalizedDocuments(documents: KnowledgeDoc[], locale?: SupportLocale): KnowledgeDoc[] {
  if (!locale) return documents;
  const score = (doc: KnowledgeDoc) => {
    const tag = matchLocale(doc.locale);
    if (tag === locale) return 3;
    if (!tag) return 2;
    return tag.startsWith('en-') ? 1 : 0;
  };
  const selected = new Map<string, KnowledgeDoc>();
  for (const doc of documents) {
    const key = JSON.stringify([doc.id, doc.version]);
    const previous = selected.get(key);
    if (!previous || score(doc) > score(previous)) selected.set(key, doc);
  }
  return [...selected.values()];
}

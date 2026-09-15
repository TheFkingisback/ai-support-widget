import type { Metadata } from 'next';
import { DocArticle } from '../components/doc-article';
import { article } from '../content/error-reference';
export const metadata: Metadata = { title: article.title, description: article.summary };
export default function Page() { return <DocArticle article={article} />; }

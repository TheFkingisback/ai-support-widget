export interface Section { id: string; title: string; text: string[]; bullets?: string[]; code?: string; language?: string; note?: string; rows?: string[][]; links?: {label: string; href: string}[] }
export interface Article { slug: string; title: string; category: string; summary: string; keywords: string; sections: Section[] }

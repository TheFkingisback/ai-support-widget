'use client';

import type { AnchorHTMLAttributes } from 'react';
import { useLocale } from '@/lib/localization';
import { localizedArtifact } from '@/lib/artifact-path';
import kitHashes from '../../public/downloads/locales.json';

export function ArtifactLink({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...props} href={localizedArtifact(href, useLocale())} />;
}

export function KitChecksum() {
  return <code className="mt-1 block break-all text-xs" dir="ltr">{kitHashes[useLocale()]}</code>;
}

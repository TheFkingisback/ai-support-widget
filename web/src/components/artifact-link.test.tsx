import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguagePicker, LocaleProvider } from '@/lib/localization';
import { ArtifactLink, KitChecksum } from './artifact-link';
import hashes from '../../public/downloads/locales.json';

describe('localized integration downloads', () => {
  it('changes the documents, archive and checksum together when the reader changes scripts', async () => {
    render(<LocaleProvider initial="sr-Latn" initialMessages={{}}>
      <LanguagePicker />
      <ArtifactLink href="/integration-v4/INICIAR.html">Manual</ArtifactLink>
      <ArtifactLink href="/downloads/ai-support-starter.zip">Starter</ArtifactLink>
      <ArtifactLink href="/integration-v4/context.schema.json">Schema</ArtifactLink>
      <KitChecksum />
    </LocaleProvider>);
    expect(screen.getByText(hashes['sr-Latn'])).toBeInTheDocument();
    expect(screen.getByText('Manual')).toHaveAttribute('href', '/integration-v4/sr-Latn/INICIAR.html');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sr-Cyrl' } });
    await waitFor(() => expect(screen.getByText('Manual')).toHaveAttribute('href', '/integration-v4/sr-Cyrl/INICIAR.html'));
    expect(screen.getByText('Starter')).toHaveAttribute('href', '/downloads/sr-Cyrl/ai-support-starter.zip');
    expect(screen.getByText(hashes['sr-Cyrl'])).toBeInTheDocument();
    expect(screen.getByText('Schema')).toHaveAttribute('href', '/integration-v4/context.schema.json');
  });
});

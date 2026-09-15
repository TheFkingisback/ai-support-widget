import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DevelopersPage from './page';
import { CodeBlock } from './components/code-block';
import { DocSearch } from './components/doc-search';
vi.mock('next/navigation', () => ({ usePathname: () => '/developers' }));
describe('Dev Center', () => {
  it('links to the current integration paths and switches the session example', () => {
    render(<DevelopersPage />);
    expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Seu produto.');
    expect(screen.getByRole('link',{name:/Começar a integrar/})).toHaveAttribute('href','/developers/quick-start');
    expect(screen.getByRole('link',{name:/Conecte seu MCP/})).toHaveAttribute('href','/developers/mcp');
    fireEvent.click(screen.getByRole('tab',{name:'Resposta 200'}));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('"expiresIn": 900');
  });
  it('reports clipboard failure without pretending the copy succeeded', async () => {
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:vi.fn().mockRejectedValue(new Error('denied'))}});
    render(<CodeBlock code="fixture" />);fireEvent.click(screen.getByRole('button',{name:'Copiar código'}));
    expect(await screen.findByText('Selecione o código para copiar')).toBeInTheDocument();
  });
  it('copies the exact displayed code', async () => {
    const write=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:write}});
    render(<CodeBlock code={'first\nsecond'} />);fireEvent.click(screen.getByRole('button',{name:'Copiar código'}));
    await waitFor(()=>expect(write).toHaveBeenCalledWith('first\nsecond'));
    expect(await screen.findByText('Copiado')).toBeInTheDocument();
  });
  it('searches with accents and handles empty results', () => {
    HTMLDialogElement.prototype.showModal=vi.fn();render(<DocSearch/>);
    fireEvent.click(screen.getByRole('button',{name:/Buscar na documentação/}));
    fireEvent.change(screen.getByLabelText('Termo da busca'),{target:{value:'autenticacao'}});
    expect(screen.getByText('Autenticação')).toBeInTheDocument();
    expect(screen.queryByText('Downloads')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Termo da busca'),{target:{value:'no-match-123'}});
    expect(screen.getByText(/Nenhum resultado/)).toBeInTheDocument();
  });
});

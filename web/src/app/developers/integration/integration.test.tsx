import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import IntegrationGuidePage from './page';
describe('Integration acceptance guide', () => {
  it('requires real response, isolation and a separate MCP acceptance', () => {
    render(<IntegrationGuidePage/>);
    expect(screen.getByRole('heading',{level:1,name:'Homologação'})).toBeInTheDocument();
    expect(screen.getByText(/O aceite do chat é separado do aceite do MCP/)).toBeInTheDocument();
    expect(screen.getByText(/Contexto válido, snapshot correspondente e resposta real/)).toBeInTheDocument();
    expect(screen.getByRole('link',{name:/Baixar formulário/})).toHaveAttribute('href','/integration-v3/ACEITE.md');
    expect(screen.queryByText('Implement 4 Endpoints')).not.toBeInTheDocument();
  });
});

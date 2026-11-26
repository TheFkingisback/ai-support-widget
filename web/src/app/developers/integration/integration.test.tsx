import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import IntegrationGuidePage from './page';
describe('Integration acceptance guide', () => {
  it('requires real response, isolation and a separate MCP acceptance', () => {
    render(<IntegrationGuidePage/>);
    expect(screen.getByRole('heading',{level:1,name:'Homologação'})).toBeInTheDocument();
    expect(screen.getByText(/Use um token curto por servidor e por pessoa/)).toBeInTheDocument();
    expect(screen.getByText(/Contexto válido, snapshot correspondente e resposta real/)).toBeInTheDocument();
    expect(screen.getByRole('link',{name:/Baixar formulário/})).toHaveAttribute('href','/integration-v4/en-US/ACEITE.md');
    expect(screen.queryByText('Implement 4 Endpoints')).not.toBeInTheDocument();
  });
});

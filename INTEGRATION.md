# Integração do aplicativo

[Guia de integração vigente](integration/v4/GUIA.md) · [Contrato MCP por sessão](integration/v4/MCP.md)

Consulte o [manual e os downloads no idioma selecionado](https://support-ai.pontes.uk/developers/downloads). Para compartilhar uma edição específica, acrescente `?lang=sr-Latn`, por exemplo. Cada edição inclui o manual HTML para leitura offline e impressão, o guia Markdown, o contrato MCP, os formulários, o prompt e um starter executável.

## Atualizar e empacotar as traduções

Os textos de origem estão em `integration/v4`, `integration/starter/README.md` e `integration/documents.py`. Os catálogos em `integration/translations/<idioma>.json` usam como chave os 12 primeiros caracteres do SHA-256 de cada trecho de origem. Uma alteração de texto exige atualizar o trecho em cada idioma. Para listar as chaves e textos atuais, execute na raiz:

```sh
python -c "import sys; sys.path.insert(0, 'integration'); from documents import phrases; print(*phrases().items(), sep='\n')"
```

Para gerar os manuais, montar os dois ZIPs por idioma e conferir o conteúdo e os hashes:

```sh
python -m pip install -r integration/requirements.txt
python integration/package.py
python scripts/verify-assets.py
```

Os arquivos publicados ficam em `web/public/integration-v4/<idioma>/` e `web/public/downloads/<idioma>/`. O manifesto de cada idioma contém o nome, o tamanho e o SHA-256 dos dois arquivos ZIP.

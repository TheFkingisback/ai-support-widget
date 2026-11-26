"""Sources shared by the translated manuals, offline kits and runnable starters."""
from hashlib import sha256
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "web/public"
V4 = ROOT / "integration/v4"
STARTER = ROOT / "integration/starter"
DOCUMENTS = {name: V4 / name for name in ("GUIA.md", "MCP.md", "ACEITE.md", "PUBLICACAO.md", "PROMPT-TENANT.txt")}
DOCUMENTS["README.md"] = STARTER / "README.md"
LABELS = {
    "title": "Manual de integração do suporte",
    "description": "Autenticação, contexto e ferramentas com responsabilidades e critérios de aceite definidos.",
    "markdown": "Versão Markdown", "acceptance": "Formulário de aceite", "print": "Imprimir",
    "navigation": "Navegação", "search": "Buscar seção", "copy": "Copiar exemplo",
    "copied": "Copiado", "selected": "Selecionado — use Ctrl+C",
    "sampleTitle": "AI Support Widget sample workspace", "activity": "Import activity",
    "loadError": "The widget script could not load. Check the SDK URL and reload the page.",
    "fileMissing": "The sample file is missing. Extract the entire starter ZIP.",
}
# Only natural-language spans in executable examples are translated. Names and wire values stay stable.
CODE = {
    "backend-session.mjs": ["Node.js 20+. Backend only. Authenticate the application session BEFORE calling this function."],
    "widget-controller.mjs": ["Load the pinned local SDK once. The host must never load a second SDK version.",
        "Mount after authenticated bootstrap; destroy immediately on logout, role or merchant change.",
        "Unexpected SDK already loaded", "Support SDK unavailable", "Support session changed", "Support disposed"],
    "mcp-auth.mjs": ["Backend only. Implement verifyAccessToken with your issuer's SDK or token introspection.",
        "It must check issuer, signature or active state, exact resource audience and expiration.",
        "The returned subject must identify the current organization membership.",
        "Each handler authorizes the requested resource and scope in the application."],
    "examples.test.mjs": ["backend uses a strict issuer payload and rejects wrong tenants",
        "the provider authenticates a short-lived access token for this resource and subject"],
    "bootstrap.mjs": ["Mount on your app server. The two callbacks must use your application's authenticated data."],
    "sample.js": ["This sample runs in its own window. Only its synthetic requests are intercepted."],
}

def read(path):
    return path.read_text(encoding="utf-8")

def key(text):
    return sha256(text.encode()).hexdigest()[:12]

def document(name, translate):
    def span(text):
        return translate(text) if text.strip() and re.search(r'[^\W\d_]', text) else text
    result = []
    fence = None
    for line in read(DOCUMENTS[name]).splitlines():
        if line.startswith("~~~") or line.startswith(chr(96) * 3):
            fence = None if fence is not None else line[3:]
        elif fence == "text":
            m = re.fullmatch(r'(\s*[→←]?\s*)(.*)', line)
            line = m[1] + span(m[2])
        elif fence is not None:
            if line.lstrip().startswith("// "):
                before, comment = line.split("// ", 1)
                line = before + "// " + span(comment)
        elif line.startswith("|"):
            line = "| " + " | ".join(span(cell.strip()) for cell in line.strip("|").split("|")) + " |"
        elif line and line != "[TOC]":
            prefix = re.match(r'^(?:#{1,6} (?:\d+\. )?|\d+\. )?', line)[0]
            line = prefix + span(line[len(prefix):])
        result.append(line)
    return "\n".join(result) + "\n"

def phrases():
    texts = {}
    def record(value):
        texts[key(value)] = value
        return value
    for name in DOCUMENTS:
        document(name, record)
    for value in list(LABELS.values()) + [s for values in CODE.values() for s in values]:
        record(value)
    return texts

def localized_document(name, tag, translate):
    content = document(name, translate)
    return re.sub(r"https://support-ai\.pontes\.uk/developers(?:/quick-start)?(?![/?\w-])",
                  lambda match: match[0] + "?lang=" + tag, content)

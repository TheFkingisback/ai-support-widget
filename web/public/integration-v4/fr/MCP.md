# MCP par session

Le backend de l'application envoie `POST /api/widget/sessions` avec l'identifiant d'intégration `sik_`. Il dérive la personne et son organisation de la connexion et peut inclure jusqu'à huit serveurs dans `mcpServers`. Le champ omis ou vide crée un chat avec contexte. Chaque nouvelle session reçoit sa propre liste.

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

Chaque id commence par une lettre minuscule et accepte les lettres minuscules, les chiffres, le trait de soulignement et le trait d'union, jusqu'à 32 caractères. Les identifiants, les URL normalisées et les jetons sont exclusifs dans la liste. Le transport est MCP Streamable HTTP sur HTTPS public, port 443, avec une URL sans identifiants, requête ou fragment. Le service vérifie le DNS lors de la connexion et rejette les redirections.

L'application émet ou obtient un jeton d'accès court pour chaque destination, restreint à la personne, à l'organisation, aux autorisations et à l'audience de ce MCP. Le Support AI présente `Authorization: Bearer <accessToken>` au serveur correspondant. Le fournisseur vérifie la signature ou l'introspection, l'émetteur, la validité, l'audience et l'accès à la ressource à chaque opération. Il publie dans le catalogue uniquement les outils autorisés pour cette identité. L'identifiant de la plateforme, le JWT du widget et les clés de services comme Stripe ont leurs propres finalités.

Le jeton délégué est chiffré sur le serveur pendant 900 secondes maximum. Le navigateur reçoit `{jwt, tenantKey, expiresIn: 900}`. Lors du renouvellement, le backend revalide l'identité et envoie une nouvelle liste avec des jetons valides. Une proposition créée avant le renouvellement doit être présentée à nouveau. Pour un changement d'organisation, utilisez un identifiant stable par lien et détruisez l'instance précédente du widget.

Le Support AI parcourt les pages de `tools/list`, distingue les noms identiques par serveur et utilise le nom original lors de l'appel de `tools/call`. Les catalogues de plus de 32 outils ont une recherche et une pagination dans le chat. Les limites de découverte par serveur sont de 128 pages et 4 Mo de descriptions. Une défaillance de découverte d'un serveur préserve les autres.

Les outils avec `annotations.readOnlyHint: true` peuvent être interrogés directement. Pour tout outil dont l'annotation est absente ou fausse, le chat affiche le serveur, le nom et les arguments avant l'exécution. Déclarez la lecture seule pour les opérations sans effets commerciaux. L'utilisateur répond `confirmar` ou `confirm` au message affiché dans les cinq minutes. Le SDK envoie `replyToMessageId`. La confirmation est valable pour ces arguments, serveur, session et conversation. Une nouvelle proposition remplace la précédente.

La plateforme tente une exécution après avoir enregistré la confirmation et envoie `Idempotency-Key` avec l'ID de la proposition. Pour les paiements et les opérations avec effets externes, le fournisseur doit stocker la clé et le résultat de manière atomique et respecter les clés d'idempotence requises par le service financier. Après un délai d'attente ou un résultat ambigu, le support enregistre un état inconnu, bloque de nouvelles modifications dans cette conversation et maintient les requêtes disponibles. Vérifiez l'opération dans le système d'origine avant de continuer.

Pour homologuer, testez une session sans serveurs, deux sessions du même utilisateur, deux organisations, des serveurs avec des outils homonymes et un catalogue paginé. Vérifiez la portée/expiration des jetons chez le fournisseur, l'annulation et la confirmation en double. Utilisez des enregistrements synthétiques pour vérifier le résultat à l'origine.

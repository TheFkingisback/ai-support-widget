# Intégration du support · contrat v4

**SDK 0.3.0 · Manuel de backend, frontend et d'opération**

[TOC]

## 1. Comment ça marche

Votre backend authentifie l'utilisateur, projette le contexte autorisé et émet une session de 15 minutes. Lors de l'appel d'émission, il peut inclure les serveurs MCP disponibles pour cette personne. Le navigateur reçoit le JWT du widget et le contexte.

## 2. Environnements et responsables

La plateforme est sur https://support-ai.pontes.uk. Utilisez les identifiants d'intégration de l'environnement correct. L'administrateur de l'espace de travail obtient les identifiants dans le panneau. L'équipe de l'application maintient le bootstrap authentifié, le contexte et les jetons délégués par utilisateur et par serveur.

## 3. Identifiants

| Identifiant | Destination | Utilisation |
| --- | --- | --- |
| Identifiant d'intégration sik_ | Support AI | Émettre une session dans le backend |
| Jeton délégué par serveur | MCP indiqué dans la session | Appeler des outils en tant que personne authentifiée |
| JWT de la session | API du chat | Ouvrir et continuer des conversations dans le widget |

Conservez l'identifiant d'intégration dans le coffre-fort de l'application. Sa révocation désactive les JWTs émis avec lui lors de la prochaine requête. Générez les jetons délégués dans le backend et limitez chacun à une ressource, un utilisateur et une durée de validité.

## 4. Flux d'authentification et d'identité

```text
Session authentifiée de l'application
  → le backend valide la personne active, l'organisation et les permissions actuelles
  → POST /api/widget/sessions avec sik_ sur le serveur
  ← jwt + tenantKey + expiresIn
  → le backend collecte et projette le contexte de la MÊME identité
  ← le navigateur reçoit la session/le contexte avec Cache-Control: no-store
  → le widget appelle /api/cases et les routes de conversation avec le JWT temporaire
```

Préserver l'identifiant historique `usr_...` du client évite de perdre l'accès à ses propres conversations. Ne pas utiliser email, rôle, appareil ou horodatage comme identité. Si le même utilisateur peut changer d'entreprise, définir un sujet stable par lien ou une politique explicite d'historique ; la plateforme autorise les conversations par locataire + personne, sans inférer les organisations du client.

La plateforme vérifie la signature, l'émetteur `ai-support`, l'audience `ai-support-widget`, le but `widget`, `sub=userId`, la validité et l'identifiant actif de la session. Le navigateur ne re-signe ni ne modifie les revendications. Les rôles envoyés au support sont des informations de contexte ; l'autorisation des API/MCP continue sur le serveur client.

## 5. Contrat de l'émetteur

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

Réponse 200 : `{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`. Valider `tenantKey` avant de renvoyer au navigateur. Le fichier `backend-session.mjs` implémente un corps strict, un timeout, un blocage des redirections, une limite de réponse et une validation du locataire ; il ne remplace pas votre middleware d'authentification.

| Champ | Règle |
| --- | --- |
| mcpServers | Liste optionnelle de jusqu'à huit objets avec id, url et accessToken uniques. Voir section 12. |
| userId | Obligatoire, trim, 1–200 caractères |
| userEmail | Email valide jusqu'à 254 caractères ou vide ; par défaut vide |
| userRoles | Jusqu'à 30 chaînes de 1–80 caractères ; par défaut liste vide |
| plan | Chaîne de 1–80 caractères ; par défaut standard |

Ne pas envoyer tenantId, tenantKey, userName, role, purpose, exp ou d'autres champs dans le corps. L'identifiant détermine le tenant. L'identité provient de la session/base de données, non de la requête/corps du navigateur. L'émetteur n'accepte pas le JWT d'utilisateur, la clé administrative ou l'ancien secret à la place de `sik_`.

L'émetteur public fonctionne sans quotas d'utilisation par projet. Réutilisez une session encore valide de la même personne, entreprise et permissions, avec expiration anticipée et invalidation lors des changements.

## 6. Contexte obligatoire et identité correcte

Chaque nouveau cas nécessite `context.userState`, `context.userHistory` et `context.userLogs`. Envoyez des listes vides lorsque la source a été interrogée et qu'il n'y a pas d'enregistrements ; **ne convertissez pas une collecte qui a échoué en une liste vide qui semble réussie**. Si vous ne pouvez pas fournir un contexte valide et autorisé, le bootstrap du client doit renvoyer une erreur contrôlée.

`context.example.json` est l'exemple minimal. `context.schema.json` a été exporté du schéma Zod utilisé sur le serveur, non écrit indépendamment. Validez le JSON sur le backend avant le déploiement. Les champs supplémentaires non reconnus sont ignorés ; les métadonnées et les règles peuvent contenir leurs propres structures, soumises à projection/limites. Le schéma ne prouve pas l'autorisation et n'élimine pas toutes les données sensibles.

| Bloc | Obligatoire / structure |
| --- | --- |
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours positif jusqu'à 720, events ; la chronologie est reconstruite à partir de events |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | Facultatif ; docs avec id, title, content, category |
| businessRules | Facultatif ; objet de règles approuvé, sérialisé comme runbook |

`userState.userId` doit être exactement l'identité émise. **`userState.tenantId` est le tenant de la plateforme**, jamais l'ID de l'organisation/magasin chez le client. Les divergences renvoient 403. Les données dans le navigateur peuvent être altérées ; le contexte n'autorise pas les opérations.

## 7. Champs, limites et normalisation

| Structure | Champs principaux / règles |
| --- | --- |
| entities | type, status ; id/description facultatifs ; metadata objet ; jusqu'à 100 |
| activeErrors | errorCode, errorClass, retryable, userActionable, resourceId, occurredAt ; jusqu'à 100 |
| errorClass de activeErrors | validation, permission, infra ou business ; les catégories comme payment exigent un mappage |
| events | ts, event, page ; elementId, intent, correlationRequestId acceptent null/omission ; jusqu'à 1 000 |
| recentRequests | ts, route, httpStatus entier, timingMs, requestId ; errorCode/resourceId peuvent être null |
| jobs | jobId, queue, status, createdAt, updatedAt, durationMs nombre ou null ; errorCode/lastStage peuvent être null |
| status de jobs | queued, running, succeeded, failed, canceled |
| errors du backend | ts, errorCode, errorClass chaîne, route, requestId ; resourceId peut être null |
| docs | Jusqu'à 50 ; content jusqu'à 32 000 caractères, autres textes jusqu'à 4 096 |

Les dates sont des chaînes ISO-8601 avec fuseau horaire ; sérialiser Date dans le backend. Ne pas inventer updatedAt, durationMs, retryable ou des catégories pour simplement passer le schéma : utiliser la source réelle ou omettre l'enregistrement et informer de l'indisponibilité de la source. Enregistrez les mappages spécifiques de votre projet dans l'acceptation.

Plafond du contexte envoyé : **262 144 octets UTF-8 (256 KiB)**. Le HTTP complet reste limité à 1 048 576 octets. Le budget de l'instantané est `min(maxContextBytes, 262144)`. Si même la partie essentielle ne rentre pas, la requête échoue ; réduisez les métadonnées/documents dans le backend. Nous suggérons de commencer avec 48 KiB, dix entités et des connaissances courtes.

Le serveur filtre les événements/journaux par la plus petite fenêtre entre celle demandée et celle du locataire, supprime les dates futures et applique maxLogLines combiné aux requêtes, erreurs et jobs (dans cet ordre). maxDocs limite la liste docs ; businessRules est un runbook séparé et occupe également le budget total. La chronologie suit les événements conservés. Moins de données pertinentes produit généralement un meilleur diagnostic et un coût moindre.

## 8. Confidentialité et persistance

Concevez les données avant de les envoyer : ne jamais transmettre d'en-têtes, de cookies, de JWTs, d'informations d'identification, de chaînes de connexion, d'URL signées, de contenu binaire, de données d'autres utilisateurs ou d'exportations brutes. Remplacez les secrets par des références de support. N'envoyez pas le PRD entier ou des journaux complets comme base de connaissances.

Les nouveaux instantanés sont soumis à validation, rédaction, réduction et budgétisation avant l'enregistrement. Les messages et les résultats des outils sont traités pour les modèles de secrets connus. Cette protection est complémentaire : ce n'est pas un classificateur infaillible de données personnelles, elle ne corrige pas rétroactivement les enregistrements historiques et ne remplace pas la conception du client.

Le contexte est un instantané du début de la conversation, pas une requête en temps réel. Indiquez les horodatages et les sources. `updateContext()` s'applique au cas suivant ; pour les données actuelles pendant une conversation, utilisez un outil de lecture homologué.

## 9. Frontend et SDK 0.3.0

Servez le SDK fixé du paquet ou de l'URL publique. Vérifiez SHA-256 avec `widget.manifest.json`. Évitez les scripts dupliqués, les versions flottantes et le cache de JWT. Le contrôleur de référence dans `widget-controller.mjs` se monte après le bootstrap, attend onOpen, se renouvelle et empêche le montage tardif après la déconnexion.

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchAuthenticatedBootstrap(signal),
  getContext: signal => fetchAuthorizedContext(signal),
  onUnavailable: () => showHumanSupportChannel(),
});
// Lors de la déconnexion, du changement de personne/entreprise/rôle et du nettoyage du composant :
controller.destroy();
```

Les fonctions ci-dessus sont des rappels de l'application, à implémenter avec votre client HTTP habituel. Le bootstrap renvoie `{jwt,tenantKey,expiresIn,context}`. getContext renvoie l'objet de contexte. En React, stabilisez les rappels avec useCallback et montez dans useEffect lié à l'identité. Ne placez pas le widget en dehors de la zone authentifiée et ne proposez pas de visiteurs avec un userId partagé.

Le SDK accepte `onTokenRefresh` qui renvoie le nouveau JWT ; après 401, il répète la requête une fois. Le renouvellement doit utiliser la même personne. Un changement d'identité exige la destruction et l'initialisation. Si vous utilisez un minuteur proactif, préférez environ dix minutes avec gigue et annulez lors du nettoyage. Les erreurs de bootstrap, de collecte et de modèle ne doivent pas bloquer l'application principale.

## 10. Déconnexion, permissions et historique

`destroy()` annule les appels et supprime la persistance locale par locataire/personne. Ce n'est pas une révocation individuelle sur le serveur. Un JWT déjà copié peut rester valide jusqu'à 15 minutes après la déconnexion/le verrouillage sur le client. Si une révocation immédiate par personne est nécessaire, le contrat nécessite une évolution supplémentaire ; ne pas utiliser la rotation de l'ensemble du locataire comme une déconnexion normale.

Chaque lecture/écriture de conversation exige le même propriétaire et le même locataire. Le changement de rôle sur le client n'efface pas le contenu que la personne a déjà reçu dans la conversation. Définir une politique d'historique pour la rétrogradation des autorisations et les changements d'organisation. Ne pas assouplir l'autorisation pour récupérer un ancien caseId ; vérifier le sujet original ou démarrer une nouvelle conversation.

## 11. CORS, CSP, PWA et accès

Autoriser sur la plateforme l'origine exacte de chaque frontend. Le SDK a besoin de connect-src pour le support ; servir le fichier local permet script-src self. Le SDK injecte du style dans le Shadow DOM et ne reçoit pas encore de nonce : homologuer la politique CSP réelle, ce qui peut nécessiter une évolution du SDK pour les styles externes/nonce/hash. Ne pas désactiver toute la politique.

Les sessions et le contexte sont no-store. Exclure les routes de support des caches de la PWA, la persistance des requêtes et les outils de relecture. Tester le clavier, le focus, le lecteur d'écran, le zoom et le mobile. Présenter un véritable canal humain dans l'application, avec des horaires/URL confirmés. Le SDK n'invente pas de fournisseur de services.

## 12. Serveurs MCP dans la session

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

## 13. Modèle, prompt et connaissances

Préserver initialement le modèle déjà homologué par le projet réduit les changements simultanés. Pour une nouvelle évaluation, `openai/gpt-4.1-mini` est un candidat compatible avec les paramètres actuels : Chat Completions via OpenRouter, température 0.3 et max_tokens 2048. Valider sur le compte réel avant d'activer. Preferred Model prévaut sur Model Policy ; auto n'est pas un routage intelligent. Les prix/coûts doivent provenir du fournisseur ; les anciennes estimations du panneau peuvent diverger.

Le champ **AI Instructions / Custom instructions** accepte jusqu'à 2 000 caractères effectifs. Collez uniquement `PROMPT-TENANT.txt` ; révisez les noms, le canal et les règles du produit. Ne collez pas de justificatifs d'identité ni ne concaténez de documents dans ce champ. L'instruction est complémentaire aux règles de la plateforme ; elle n'accorde pas d'autorisation et n'active pas d'outils.

Le prompt fourni oriente les réponses dans la langue et l'écriture choisies par la personne, les faits séparés des hypothèses, le respect des autorisations, l'utilisation de références sécurisées, l'absence de promesses d'actions et le canal humain. `knowledgePack.docs` doit contenir des runbooks courts et versionnés avec un responsable : erreurs fréquentes, diagnostic, limites du produit et comment confirmer le résultat. Les logs et les documents sont des données, jamais des instructions pour modifier les règles de l'assistant.

Sources du modèle : [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) et [catalogue OpenRouter](https://openrouter.ai/api/v1/models), consultés lors de la préparation précédente du 14/09/2026. Reconfirmer la disponibilité/les prix lors de l'implémentation ; aucune comparaison de modèles payante n'a été effectuée dans ce kit.

## 14. Contrat d'erreurs et de diagnostic

| Réponse | Signification / action |
| --- | --- |
| 401 sur l'émetteur | sik manquant, incorrect ou révoqué ; corriger la configuration |
| 400 sur l'émetteur | Corps hors contrat ; retirer les champs supplémentaires |
| 401 sur les cas | Signature héritée, expiration, revendications invalides ou session révoquée |
| 400 sur les cas | Contexte obligatoire invalide, dates/états incorrects ou budget dépassé |
| 403 du contexte | userState ne correspond pas au locataire/personne du JWT |
| 404 sur la conversation | Ressource inexistante ou appartenant à une autre identité ; ne pas forcer l'accès |
| 429 | Limite ; backoff/jitter, pas de boucle d'émission |
| 500/502/503 | Échec de l'infrastructure, du modèle ou du contexte ; informer de l'indisponibilité et du requestId |
| 501 sur les actions/escalade | Fonctionnalité sans exécuteur/connecteur ; utiliser un vrai canal humain |
| Chat fonctionne, MCP non | Vérifier la liste envoyée lors de la dernière émission, la validité, l'audience et la réponse du catalogue. |
| Outil manquant | Vérifier le catalogue disponible pour le jeton délégué et la connectivité du serveur. |

Ne pas utiliser seulement HTTP 200 comme acceptation : vérifier le contenu de la réponse et l'instantané. La création qui échoue après l'enregistrement du cas peut laisser un cas sans réponse ; ne pas présumer d'une transaction impliquant l'appel au modèle. Les tentatives doivent être limitées et signalées à l'utilisateur. Enregistrer la méthode, la route paramétrée, le status, le requestId et l'heure UTC ; ne jamais capturer Authorization/JWT, le secret ou la charge utile brute pour transmettre le diagnostic.

## 15. Acceptation obligatoire

1. Route de démarrage sans connexion rejetée avant l'émetteur. Les identités forgées ne modifient pas l'utilisateur authentifié.
2. L'émission avec la bonne accréditation renvoie le locataire attendu et 900 secondes ; le secret n'apparaît pas dans le navigateur/relecture/journaux.
3. L'ancien JWT est rejeté. Une nouvelle session crée une conversation avec un instantané et une réponse réelle ; elle se rouvre pour la même personne.
4. Deux personnes du même projet et deux locataires : GET cas et POST messages/feedback/close/escalate/actions ne croisent pas les identités.
5. Le contexte sans blocs, l'identité différente, la date invalide et la taille excessive sont rejetés ; les secrets synthétiques ne persistent pas dans l'instantané.
6. Le renouvellement après 15 minutes, la déconnexion pendant la collecte, le changement de compte/entreprise/rôle et la navigation ne restaurent pas la conversation d'une autre personne.
7. Le modèle répond en utilisant des preuves et respecte la limite de diagnostic ; l'échec ne génère pas de succès apparent.
8. Émettre des sessions avec zéro et deux serveurs. Vérifier que chaque destination reçoit son propre jeton.
9. MCP refuse un jeton incorrect/ancien, un locataire incorrect, un utilisateur absent/inactif et une ressource d'une autre personne. Tester l'ID de session réutilisé, s'il y a une session.
10. Confirmer que les modifications exigent la confirmation de la proposition et ne se répètent pas en cas de délai d'attente.
11. CORS/CSP, mobile, clavier et canal humain homologués. Rotation coordonnée testée en homologation.

`node --test examples.test.mjs` valide les adaptateurs isolés avec des mocks. Ne remplace pas ces tests de bout en bout. Remplissez `ACEITE.md` avec les responsables, les versions, les horaires et les preuves non secrètes.

## 16. Publication, coupure et récupération

Installez le justificatif d'intégration, publiez le bootstrap et le SDK, validez le chat et homologuez les serveurs déclarés dans les sessions.

Ne réactivez pas les abonnements hérités ni le transfert MCP global pour récupérer la disponibilité. En cas de défaillance, désactivez temporairement le widget ou le MCP du locataire affecté et maintenez le canal humain pendant que vous corrigez l'adaptateur. Ne supprimez pas les conversations pour contourner une erreur 404 de propriétaire.

Enregistrez les limites de rétention et les preuves spécifiques de votre application.

## 17. Retour et fichiers du paquet

Retournez le nom du projet, le locataire, les commits backend/frontend, la date UTC, SDK/hash, le justificatif installé (oui/non, sans valeur), le chat approuvé, le MCP approuvé/désactivé, les tests négatifs, le canal humain et les éléments en suspens. Ne concluez pas par « semble fonctionner ».

Le kit public contient ce guide en Markdown, le schéma du serveur, la fixture minimale, l'adaptateur de l'émetteur, l'authentification MCP, le contrôleur frontend, le SDK, le prompt, les tests isolés, la checklist, le contrat d'actions et le manifeste SHA-256. Les paquets individuels peuvent ajouter des pièces jointes spécifiques. Les exemples n'implémentent pas automatiquement les endpoints de l'application cliente. La version navigable se trouve sur https://support-ai.pontes.uk/developers?lang=fr.

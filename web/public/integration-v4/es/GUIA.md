# Integración del soporte · contrato v4

**SDK 0.3.0 · Manual de backend, frontend y operación**

[TOC]

## 1. Cómo funciona

Su backend autentica al usuario, proyecta el contexto autorizado y emite una sesión de 15 minutos. En la llamada de emisión, puede incluir los servidores MCP disponibles para esa persona. El navegador recibe el JWT del widget y el contexto.

## 2. Entornos y responsables

La plataforma está en https://support-ai.pontes.uk. Use la credencial de integración del entorno correcto. El administrador del workspace obtiene la credencial en el panel. El equipo de la aplicación mantiene el bootstrap autenticado, el contexto y los tokens delegados por usuario y servidor.

## 3. Credenciales

| Credencial | Destino | Uso |
| --- | --- | --- |
| Credencial de integración sik_ | Support AI | Emitir una sesión en el backend |
| Token delegado por servidor | MCP indicado en la sesión | Llamar herramientas como la persona autenticada |
| JWT de la sesión | API del chat | Abrir y continuar conversaciones en el widget |

Guarde la credencial de integración en el almacén de la aplicación. Revocarla desactiva los JWTs emitidos con ella en la próxima solicitud. Genere los tokens delegados en el backend y limite cada uno a un recurso, usuario y plazo de validez.

## 4. Flujo de autenticación e identidad

```text
Sesión autenticada de la aplicación
  → backend valida persona activa, organización y permisos actuales
  → POST /api/widget/sessions con sik_ en el servidor
  ← jwt + tenantKey + expiresIn
  → backend recolecta y proyecta contexto de la MISMA identidad
  ← browser recibe sesión/contexto con Cache-Control: no-store
  → widget llama /api/cases y rutas de la conversación con el JWT temporal
```

Preservar el identificador histórico `usr_...` del cliente evita perder acceso a las propias conversaciones. No usar email, rol, dispositivo o timestamp como identidad. Si el mismo usuario puede cambiar de empresa, definir subject estable por vínculo o política explícita de historial; la plataforma autoriza conversaciones por tenant + persona, sin inferir organizaciones del cliente.

La plataforma verifica firma, emisor `ai-support`, audiencia `ai-support-widget`, propósito `widget`, `sub=userId`, validez y la credencial activa de la sesión. El browser no vuelve a firmar ni altera claims. Los roles enviados al soporte son información de contexto; la autorización de APIs/MCP continúa en el servidor cliente.

## 5. Contrato del emisor

```http
POST https://support-ai.pontes.uk/api/widget/sessions
Authorization: Bearer <SUPPORT_INTEGRATION_CREDENTIAL>
Content-Type: application/json

{"userId":"usr_usuario_autenticado","userEmail":"","userRoles":["member"],"plan":"standard"}
```

Respuesta 200: `{"jwt":"<JWT>","tenantKey":"ten_do_projeto","expiresIn":900}`. Validar `tenantKey` antes de devolver al browser. El archivo `backend-session.mjs` implementa cuerpo estricto, timeout, bloqueo de redirecciones, límite de respuesta y validación del tenant; no sustituye su middleware de autenticación.

| Campo | Regla |
| --- | --- |
| mcpServers | Lista opcional de hasta ocho objetos con id, url y accessToken exclusivos. Ver sección 12. |
| userId | Obligatorio, trim, 1–200 caracteres |
| userEmail | Email válido hasta 254 caracteres o vacío; default vacío |
| userRoles | Hasta 30 strings de 1–80 caracteres; default lista vacía |
| plan | String de 1–80 caracteres; default standard |

No envíe tenantId, tenantKey, userName, rol, purpose, exp u otros campos en el cuerpo. La credencial determina el tenant. La identidad proviene de la sesión/base de datos, no de la consulta/cuerpo del navegador. El emisor no acepta JWT de usuario, clave administrativa o secreto antiguo en lugar de `sik_`.

El emisor público funciona sin cuotas de uso por proyecto. Reutilice una sesión aún válida de la misma persona, empresa y permisos, con expiración anticipada e invalidación en los cambios.

## 6. Contexto obligatorio e identidad correcta

Cada nuevo caso requiere `context.userState`, `context.userHistory` y `context.userLogs`. Envíe listas vacías cuando la fuente fue consultada y no hay registros; **no convierta una recolección fallida en una lista vacía que parezca exitosa**. Si no puede proporcionar un contexto válido y autorizado, el bootstrap del cliente debe devolver un error controlado.

`context.example.json` es el ejemplo mínimo. `context.schema.json` fue exportado del esquema Zod usado en el servidor, no escrito independientemente. Valide el JSON en el backend antes del despliegue. Los campos extras no reconocidos se descartan; los metadatos y las reglas pueden contener estructuras propias, sujetas a proyección/límites. El esquema no prueba la autorización ni elimina todos los datos sensibles.

| Bloque | Obligatorio / estructura |
| --- | --- |
| userState | userId, tenantId, roles, plan, featuresEnabled, entities, activeErrors, limitsReached |
| userHistory | windowHours positivo hasta 720, events; la línea de tiempo se reconstruye a partir de events |
| userLogs | recentRequests, jobs, errors |
| knowledgePack | Opcional; docs con id, title, content, category |
| businessRules | Opcional; objeto de reglas aprobado, serializado como runbook |

`userState.userId` debe ser exactamente la identidad emitida. **`userState.tenantId` es el tenant de la plataforma**, nunca el ID de la organización/tienda en el cliente. Las divergencias devuelven 403. Los datos en el navegador pueden ser adulterados; el contexto no autoriza operaciones.

## 7. Campos, límites y normalización

| Estructura | Campos principales / reglas |
| --- | --- |
| entities | type, status; id/description opcionales; metadata objeto; hasta 100 |
| activeErrors | errorCode, errorClass, retryable, userActionable, resourceId, occurredAt; hasta 100 |
| errorClass de activeErrors | validation, permission, infra o business; categorías como payment exigen mapeo |
| events | ts, event, page; elementId, intent, correlationRequestId aceptan null/omisión; hasta 1.000 |
| recentRequests | ts, route, httpStatus entero, timingMs, requestId; errorCode/resourceId pueden ser null |
| jobs | jobId, queue, status, createdAt, updatedAt, durationMs número o null; errorCode/lastStage pueden ser null |
| status de jobs | queued, running, succeeded, failed, canceled |
| errors del backend | ts, errorCode, errorClass string, route, requestId; resourceId puede ser null |
| docs | Hasta 50; content hasta 32.000 caracteres, demás textos hasta 4.096 |

Las fechas son strings ISO-8601 con zona horaria; serializar Date en el backend. No inventar updatedAt, durationMs, retryable o categorías para solo pasar el esquema: usar el origen real u omitir el registro e informar la indisponibilidad de la fuente. Registre los mapeos específicos de su proyecto en la aceptación.

Contexto enviado: **262.144 bytes UTF-8 (256 KiB)**. El HTTP completo sigue limitado a 1.048.576 bytes. El presupuesto de la instantánea es `min(maxContextBytes, 262144)`. Si ni siquiera la parte esencial cabe, la solicitud falla; reduzca los metadatos/documentos en el backend. Sugerimos empezar con 48 KiB, diez entidades y conocimiento corto.

El servidor filtra eventos/registros por la ventana más pequeña entre la solicitada y la del inquilino, elimina fechas futuras y aplica maxLogLines combinado a solicitudes, errores y jobs (en este orden). maxDocs limita la lista docs; businessRules es un runbook separado y también ocupa el presupuesto total. La línea de tiempo sigue los eventos mantenidos. Menos datos relevantes suele producir un mejor diagnóstico y un menor costo.

## 8. Privacidad y persistencia

Diseñe los datos antes de enviarlos: nunca reenvíe encabezados, cookies, JWTs, credenciales, cadenas de conexión, URL firmadas, contenido binario, datos de otros usuarios o exportaciones brutas. Reemplace los secretos con referencias de soporte. No envíe el PRD completo o registros completos como base de conocimiento.

Las nuevas instantáneas pasan por validación, redacción, reducción y presupuesto antes de la grabación. Los mensajes y resultados de las herramientas tienen un tratamiento de patrones conocidos de secretos. Esta protección es complementaria: no es un clasificador infalible de datos personales, no corrige retroactivamente registros históricos ni reemplaza la proyección del cliente.

El contexto es una instantánea del inicio de la conversación, no una consulta en tiempo real. Informe marcas de tiempo y fuentes. `updateContext()` es válido para el siguiente caso; para datos actuales durante una conversación, use una herramienta de lectura homologada.

## 9. Frontend y SDK 0.3.0

Sirva el SDK fijado del paquete o de la URL pública. Verifique SHA-256 con `widget.manifest.json`. Evite scripts duplicados, versiones flotantes y caché de JWT. El controlador de referencia en `widget-controller.mjs` se monta después del arranque, espera onOpen, se renueva e impide el montaje tardío después del cierre de sesión.

```js
const controller = mountSupport({
  apiUrl: 'https://support-ai.pontes.uk',
  bootstrap: signal => fetchAuthenticatedBootstrap(signal),
  getContext: signal => fetchAuthorizedContext(signal),
  onUnavailable: () => showHumanSupportChannel(),
});
// En el cierre de sesión, cambio de persona/empresa/rol y limpieza del componente:
controller.destroy();
```

Las funciones anteriores son callbacks de la aplicación, a implementar con su cliente HTTP habitual. Bootstrap devuelve `{jwt,tenantKey,expiresIn,context}`. getContext devuelve el objeto de contexto. En React, estabilice los callbacks con useCallback y monte en useEffect vinculado a la identidad. No coloque el widget fuera del área autenticada ni ofrezca visitantes con un userId compartido.

El SDK acepta `onTokenRefresh` que devuelve el nuevo JWT; después de 401, repite la solicitud una vez. La renovación debe usar la misma persona. El cambio de identidad requiere destruir e inicializar. Si usa un temporizador proactivo, prefiera unos diez minutos con fluctuación y cancele en la limpieza. Los errores de arranque, recopilación y modelo no deben bloquear la aplicación principal.

## 10. Cierre de sesión, permisos e historial

`destroy()` anula llamadas y elimina la persistencia local por inquilino/persona. No es una revocación individual en el servidor. Un JWT ya copiado puede seguir siendo válido hasta 15 minutos después de cerrar sesión/bloquearse en el cliente. Si necesita una revocación inmediata por persona, el contrato requiere una evolución adicional; no utilice la rotación de todo el inquilino como un cierre de sesión normal.

Cada lectura/escritura de conversación exige el mismo propietario e inquilino. El cambio de rol en el cliente no borra el contenido que la persona ya recibió en la conversación. Definir una política de historial para la degradación de permisos y los cambios de organización. No relajar la autorización para recuperar un caseId antiguo; verificar el sujeto original o iniciar una nueva conversación.

## 11. CORS, CSP, PWA y acceso

Permitir en la plataforma el origen exacto de cada frontend. El SDK necesita connect-src para el soporte; servir el archivo local permite script-src self. El SDK inyecta estilo en el Shadow DOM y aún no recibe nonce: homologar la política CSP real, pudiendo exigir la evolución del SDK para estilos externos/nonce/hash. No apagar la política entera.

Las sesiones y el contexto son no-store. Excluir las rutas de soporte de las cachés de la PWA, la persistencia de consultas y las herramientas de reproducción. Probar el teclado, el enfoque, el lector de pantalla, el zoom y el móvil. Presentar un canal humano verdadero en la aplicación, con horario/URL confirmados. El SDK no inventa un proveedor de atención.

## 12. Servidores MCP en la sesión

El backend de la aplicación envía `POST /api/widget/sessions` con la credencial de integración `sik_`. Deriva la persona y su organización del inicio de sesión y puede incluir hasta ocho servidores en `mcpServers`. El campo omitido o vacío crea un chat con contexto. Cada nueva sesión recibe su propia lista.

```json
{
  "userId": "usr_ana",
  "mcpServers": [
    {"id":"billing","url":"https://billing.example/mcp","accessToken":"TOKEN_DELEGADO_BILLING"},
    {"id":"crm","url":"https://crm.example/mcp","accessToken":"TOKEN_DELEGADO_CRM"}
  ]
}
```

Cada id comienza con una letra minúscula y acepta letras minúsculas, dígitos, guion bajo y guion, hasta 32 caracteres. Los IDs, las URLs normalizadas y los tokens son exclusivos en la lista. El transporte es MCP Streamable HTTP en HTTPS público, puerto 443, con URL sin credenciales, consulta o fragmento. El servicio verifica el DNS al conectar y rechaza las redirecciones.

La aplicación emite u obtiene un token de acceso corto para cada destino, restringido a la persona, organización, permisos y audiencia de ese MCP. El Support AI presenta `Authorization: Bearer <accessToken>` al servidor correspondiente. El proveedor verifica la firma o introspección, el emisor, la validez, la audiencia y el acceso al recurso en cada operación. Publica en el catálogo solo las herramientas permitidas para esa identidad. La credencial de la plataforma, el JWT del widget y las claves de servicios como Stripe tienen finalidades propias.

El token delegado queda cifrado en el servidor por hasta 900 segundos. El navegador recibe `{jwt, tenantKey, expiresIn: 900}`. Al renovar, el backend revalida la identidad y envía una nueva lista con tokens válidos. Una propuesta creada antes de la renovación debe presentarse nuevamente. Para el cambio de organización, use un identificador estable por vínculo y destruya la instancia anterior del widget.

El Support AI recorre las páginas de `tools/list`, distingue nombres iguales por servidor y usa el nombre original al llamar a `tools/call`. Los catálogos con más de 32 herramientas tienen búsqueda y paginación dentro del chat. Los límites de descubrimiento por servidor son 128 páginas y 4 MB de descripciones. Un fallo de descubrimiento de un servidor preserva los demás.

Las herramientas con `annotations.readOnlyHint: true` pueden consultarse directamente. Para toda herramienta con la anotación ausente o falsa, el chat muestra el servidor, el nombre y los argumentos antes de ejecutar. Declare solo lectura para operaciones sin efectos comerciales. El usuario responde `confirmar` o `confirm` al mensaje mostrado en un plazo de cinco minutos. El SDK envía `replyToMessageId`. La confirmación es válida para esos argumentos, servidor, sesión y conversación. Una nueva propuesta sustituye a la anterior.

La plataforma intenta una ejecución después de registrar la confirmación y envía `Idempotency-Key` con el ID de la propuesta. Para pagos y operaciones con efectos externos, el proveedor debe guardar la clave y el resultado atómicamente y respetar las claves de idempotencia exigidas por el servicio financiero. Después de un tiempo de espera o un resultado ambiguo, el soporte registra un estado desconocido, bloquea nuevas alteraciones en esa conversación y mantiene las consultas disponibles. Verifique la operación en el sistema de origen antes de continuar.

Para homologar, pruebe una sesión sin servidores, dos sesiones del mismo usuario, dos organizaciones, servidores con herramientas homónimas y un catálogo paginado. Verifique el alcance/expiración de los tokens en el proveedor, la cancelación y la confirmación duplicada. Use registros sintéticos para verificar el resultado en el origen.

## 13. Modelo, prompt y conocimiento

Preservar inicialmente el modelo ya homologado por el proyecto reduce los cambios simultáneos. Para una nueva evaluación, `openai/gpt-4.1-mini` es un candidato compatible con los parámetros actuales: Chat Completions vía OpenRouter, temperatura 0.3 y max_tokens 2048. Validar en la cuenta real antes de activar. Preferred Model prevalece sobre Model Policy; auto no es enrutamiento inteligente. Los precios/costos deben provenir del proveedor; las estimaciones antiguas del panel pueden diferir.

El campo **AI Instructions / Custom instructions** acepta hasta 2.000 caracteres efectivos. Pegue solo `PROMPT-TENANT.txt`; revise nombres, canal y reglas del producto. No pegue credenciales ni concatene documentos en este campo. La instrucción es complementaria a las reglas de la plataforma; no concede autorización ni habilita herramientas.

El prompt proporcionado orienta las respuestas en el idioma y la escritura elegidos por la persona, hechos separados de hipótesis, respeto a los permisos, uso de referencias seguras, ausencia de promesas de acciones y canal humano. `knowledgePack.docs` debe contener runbooks cortos y versionados con responsable: errores frecuentes, diagnóstico, límites del producto y cómo confirmar el resultado. Los logs y documentos son datos, nunca instrucciones para alterar las reglas del asistente.

Fuentes del modelo: [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) y [catálogo OpenRouter](https://openrouter.ai/api/v1/models), consultados en la preparación previa del 14/09/2026. Reconfirmar disponibilidad/precios al implementar; no hubo comparación pagada de modelos en este kit.

## 14. Contrato de errores y diagnóstico

| Respuesta | Significado / acción |
| --- | --- |
| 401 en el emisor | sik ausente, incorrecta o revocada; corregir configuración |
| 400 en el emisor | Cuerpo fuera de contrato; retirar campos extra |
| 401 en casos | Firma heredada, expiración, claims inválidos o sesión revocada |
| 400 en casos | Contexto obligatorio inválido, fechas/estados incorrectos o presupuesto excedido |
| 403 de contexto | userState no coincide con tenant/persona de JWT |
| 404 en conversación | Recurso inexistente o perteneciente a otra identidad; no forzar acceso |
| 429 | Límite; backoff/jitter, sin bucle de emisión |
| 500/502/503 | Fallo de infraestructura, modelo o contexto; informar indisponibilidad y requestId |
| 501 en las acciones/escalamiento | Funcionalidad sin ejecutor/conector; usar canal humano real |
| Chat funciona, MCP no | Verifique la lista enviada en la última emisión, validez, audiencia y respuesta del catálogo. |
| Herramienta ausente | Verifique el catálogo disponible para el token delegado y la conectividad del servidor. |

No usar solo HTTP 200 como aceptación: verificar contenido de la respuesta y snapshot. La creación que falla después de grabar el caso puede dejar un caso sin respuesta; no presuponer transacción que involucre la llamada al modelo. Los reintentos deben ser limitados e informados al usuario. Registrar método, ruta parametrizada, status, requestId y hora UTC; nunca capturar Authorization/JWT, secreto o payload bruto para reenviar el diagnóstico.

## 15. Aceptación obligatoria

1. Ruta de bootstrap sin inicio de sesión rechazada antes del emisor. Las identidades falsificadas no cambian el usuario autenticado.
2. La emisión con la credencial correcta devuelve el tenant esperado y 900 segundos; el secreto no aparece en el navegador/reproducción/registros.
3. JWT antiguo es rechazado. La sesión nueva crea una conversación con snapshot y respuesta real; reabre para la misma persona.
4. Dos personas del mismo proyecto y dos tenants: GET caso y POST mensajes/retroalimentación/cierre/escalada/acciones no cruzan identidades.
5. Contexto sin bloques, identidad diferente, fecha inválida y tamaño excesivo son rechazados; los secretos sintéticos no persisten en el snapshot.
6. La renovación después de 15 minutos, el cierre de sesión durante la recopilación, el cambio de cuenta/empresa/rol y la navegación no restauran la conversación de otra persona.
7. El modelo responde usando evidencia y respeta el límite de diagnóstico; el fallo no genera éxito aparente.
8. Emita sesiones con cero y dos servidores. Verifique que cada destino reciba su propio token.
9. MCP rechaza token incorrecto/antiguo, tenant incorrecto, usuario ausente/inactivo y recurso de otra persona. Probar ID de sesión reutilizado, si hay sesión.
10. Confirme que los cambios requieren confirmación de la propuesta y no se repiten en caso de tiempo de espera.
11. CORS/CSP, móvil, teclado y canal humano homologados. Rotación coordinada probada en homologación.

`node --test examples.test.mjs` valida los adaptadores aislados con mocks. No reemplaza esas pruebas de extremo a extremo. Rellene `ACEITE.md` con responsables, versiones, horarios y evidencias sin secretos.

## 16. Publicación, corte y recuperación

Instale la credencial de integración, publique el bootstrap y el SDK, valide el chat y homologue los servidores declarados en las sesiones.

No reactive suscripciones legadas ni reenvío MCP global para recuperar disponibilidad. Si hay una falla, deshabilite temporalmente el widget o MCP del tenant afectado y mantenga el canal humano mientras corrige el adaptador. No borre conversaciones para eludir un 404 de propietario.

Registre los límites de retención y las evidencias específicas de su aplicación.

## 17. Devolución y archivos del paquete

Devolver nombre del proyecto, tenant, commits de backend/frontend, fecha UTC, SDK/hash, credencial instalada (sí/no, sin valor), chat aprobado, MCP aprobado/apagado, pruebas negativas, canal humano y pendientes. No concluya con “parece funcionar”.

El kit público contiene esta guía en Markdown, esquema del servidor, fixture mínima, adaptador del emisor, autenticación MCP, controlador frontend, SDK, prompt, pruebas aisladas, checklist, contrato de acciones y manifiesto SHA-256. Los paquetes individuales pueden añadir anexos específicos. Los ejemplos no implementan automáticamente los endpoints de la aplicación cliente. La versión navegable está en https://support-ai.pontes.uk/developers?lang=es.

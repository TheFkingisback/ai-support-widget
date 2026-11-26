# MCP por sesión

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

# Iniciador de AI Support Widget

Extraiga el ZIP y ejecute `node server.mjs` usando Node.js 22 o posterior. Abra la URL de loopback impresa en la terminal. Abra el chat de soporte y pregunte por qué falló la importación. La respuesta identifica la fila 42 y muestra las referencias de importación sintética y de error. Restablezca la muestra para iniciar una nueva conversación.

`server.mjs` sirve la muestra en su computadora. `starter/sample.js` se ejecuta en el navegador y responde con accesorios locales. `widget.v0.3.0.js` es la versión fijada del widget. Compare su SHA-256 con `widget.manifest.json`.

La muestra descargada se abre en el idioma de este kit. Agregue `?lang=sr-Latn`, `?lang=sr-Cyrl` o `?lang=ar` para verificar otra configuración regional disponible. Pase la configuración regional seleccionada por el usuario al montar el SDK en su aplicación.

Para integrar su propia aplicación, elimine el script de accesorios y monte `createBootstrapHandler` de `bootstrap.mjs` en su servidor de aplicaciones en una ruta como `/api/support/bootstrap`. Suministre `authenticate(request)` desde su middleware de sesión existente y `collectContext(user, tenantKey, signal)` desde su capa de datos. Establezca las variables de entorno privadas en `backend.env.example`. Inicialice el widget con el token y el contexto devueltos por esa ruta. Establezca el `handoffUrl` opcional en su página de soporte humano HTTPS. Siga la [Guía de inicio rápido del Centro de desarrolladores](https://support-ai.pontes.uk/developers/quick-start?lang=es) para el ciclo de vida de la sesión.

Su backend puede suministrar `getMcpServers(user, signal)` al controlador de arranque. Devuelva una matriz de `{id, url, accessToken}` para esta membresía autenticada. Acuñe un token de corta duración y con alcance de audiencia por servidor. Omita la devolución de llamada para chatear solo con el contexto. El navegador recibe solo la sesión y el contexto del widget.

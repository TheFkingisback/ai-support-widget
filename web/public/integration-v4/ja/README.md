# AI Support Widget スターター

ZIPを展開し、`node server.mjs`をNode.js 22以降で実行します。ターミナルに表示されるループバックURLを開きます。サポートチャットを開き、インポートが失敗した理由を尋ねます。返信は42行目を特定し、合成インポートとエラー参照を表示します。サンプルをリセットして、新しい会話を開始します。

`server.mjs`は、お使いのコンピューターでサンプルを提供します。`starter/sample.js`はブラウザーで実行され、ローカルフィクスチャで応答します。`widget.v0.3.0.js`は固定されたウィジェットリリースです。そのSHA-256を`widget.manifest.json`と比較してください。

ダウンロードされたサンプルは、このキットの言語で開きます。別の利用可能なロケールを確認するには、`?lang=sr-Latn`、`?lang=sr-Cyrl`、または`?lang=ar`を追加します。アプリケーションでSDKをマウントする際に、ユーザーが選択したロケールを渡します。

独自のアプリを統合するには、フィクスチャスクリプトを削除し、`bootstrap.mjs`から`createBootstrapHandler`を、例えば`/api/support/bootstrap`のようなルートでアプリケーションサーバーにマウントします。既存のセッションミドルウェアから`authenticate(request)`を、データレイヤーから`collectContext(user, tenantKey, signal)`を提供します。`backend.env.example`でプライベート環境変数を設定します。そのルートから返されるトークンとコンテキストでウィジェットを初期化します。オプションの`handoffUrl`をHTTPSの人間サポートページに設定します。セッションライフサイクルについては、[開発者センタークイックスタート](https://support-ai.pontes.uk/developers/quick-start?lang=ja)に従ってください。

バックエンドは、ブートストラップハンドラーに`getMcpServers(user, signal)`を提供できます。この認証されたメンバーシップに対して`{id, url, accessToken}`の配列を返します。サーバーごとに短期間でオーディエンススコープのトークンを発行します。コンテキストのみのチャットの場合はコールバックを省略します。ブラウザーはウィジェットセッションとコンテキストのみを受け取ります。

# بداية AI Support Widget

فك ضغط الـ ZIP وشغل `node server.mjs` باستخدام Node.js 22 أو أحدث. افتح عنوان الـ loopback اللي هيظهر في الـ terminal. افتح محادثة الدعم واسأل ليه الاستيراد فشل. الرد هيحدد الصف 42 وهيعرض مراجع الاستيراد والأخطاء الاصطناعية. أعد ضبط العينة عشان تبدأ محادثة جديدة.

`server.mjs` بيقدم العينة على جهاز الكمبيوتر بتاعك. `starter/sample.js` بيشتغل في المتصفح وبيرد ببيانات محلية. `widget.v0.3.0.js` هو إصدار الودجت المثبت. قارن الـ SHA-256 بتاعه بـ `widget.manifest.json`.

العينة اللي تم تنزيلها بتفتح بلغة الكيت ده. أضف `?lang=sr-Latn`، `?lang=sr-Cyrl`، أو `?lang=ar` عشان تشوف لغة تانية متاحة. مرر اللغة اللي اختارها المستخدم لما تيجي تعمل mount للـ SDK في التطبيق بتاعك.

عشان تدمج التطبيق بتاعك، شيل السكريبت بتاع الـ fixture واعمل mount للـ `createBootstrapHandler` من `bootstrap.mjs` على سيرفر التطبيق بتاعك في مسار زي `/api/support/bootstrap`. قدم `authenticate(request)` من الـ middleware بتاع الجلسة الحالي بتاعك و `collectContext(user, tenantKey, signal)` من طبقة البيانات بتاعتك. اضبط متغيرات البيئة الخاصة في `backend.env.example`. ابدأ الودجت بالتوكن والـ context اللي هيرجعوا من المسار ده. اضبط الـ `handoffUrl` الاختياري لصفحة الدعم البشري HTTPS بتاعتك. اتبع [دليل البدء السريع لمركز المطورين](https://support-ai.pontes.uk/developers/quick-start?lang=arz) لدورة حياة الجلسة.

الـ backend بتاعك ممكن يقدم `getMcpServers(user, signal)` للـ bootstrap handler. رجع مصفوفة من `{id, url, accessToken}` للعضوية الموثقة دي. اعمل توكن قصير الأجل ومحدد النطاق لكل سيرفر. احذف الـ callback للمحادثة مع الـ context بس. المتصفح بيستقبل جلسة الودجت والـ context بس.

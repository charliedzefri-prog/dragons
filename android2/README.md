# Android APK (сборка стандартными инструментами SDK)

`android2/` — рабочая сборка APK: обычная Java-активность с WebView (`src/`), манифест и ресурсы,
собирается `build.sh` через aapt2 → javac → d8 → zipalign → apksigner (v1+v2+v3).
Предыдущий вариант `android/` (ручная кодировка манифеста без SDK) на устройствах не устанавливался.

Нужны: JDK 11+, Android build-tools 34 (aapt2, d8.jar, apksigner.jar, zipalign, core-lambda-stubs.jar), android.jar платформы 34.
По умолчанию ищутся в `~/apkbuild-tools/android-14/` и `~/apkbuild-tools/android-34/android.jar`.

    ./android2/build.sh          # результат: android2/build/dragonmania.apk

Ключ подписи: `~/apkbuild-tools/dragonmania.jks` (пароль `DML_KS_PASS`, по умолчанию `dragonmania`).
Увеличивайте `android:versionCode` в `AndroidManifest.xml` при каждом обновлении.
Приложение открывает `https://dragonmania.onrender.com/mobile/`; сохранения, аккаунты и PvP общие с веб-версией.

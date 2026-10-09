# Android APK «Легенды Дракономании»

APK — это оболочка WebView: она открывает мобильную версию игры (`/mobile/`) с сервера на Render.
Игра, сохранения аккаунта и мультиплеер те же, что в браузере. Обновления игры приходят с сервера,
пересобирать APK для них не нужно. Пересборка нужна только при смене адреса сервера или версии оболочки.

## Сборка

Нужны Java 11+, `apktool.jar` (только для smali-ассемблера) и `apksigner.jar` из Android build-tools.
Положите их в `~/apkbuild-tools/` или укажите пути переменными окружения:

```bash
export APKTOOL_JAR=/path/apktool.jar        # https://github.com/iBotPeaches/Apktool/releases
export APKSIGNER_JAR=/path/apksigner.jar    # из Android SDK: build-tools/<версия>/lib/apksigner.jar
export JAVA=java                            # при необходимости — полный путь
python3 android/build_apk.py --server-url https://<имя>.onrender.com/mobile/
```

Результат: `android/build/dragonmania.apk`. Папка `android/build/` в Git не попадает (см. `.gitignore`).

- Ключ подписи: `android/build/dragonmania-release.jks` создаётся при первой сборке и переиспользуется.
  Потеряете ключ — обновления поверх уже установленной версии не встанут. Пароль по умолчанию `dragonmania`;
  для публикации задайте свой через `DML_KS_PASS` и храните ключ отдельно от репозитория.
- Версия: `--version-code` (увеличивайте при каждом обновлении APK) и `--version-name`.

## Что внутри

- `project/smali/` — код оболочки на smali: `MainActivity` (WebView на весь экран, JavaScript и localStorage,
  кнопка «назад» идёт по истории страницы), `GameChromeClient` и `DialogListener` (нативные диалоги
  для `confirm()`/`alert()` игры, например подтверждение сброса прогресса).
- `project/res/mipmap/ic_launcher.png` — иконка (та же, что у PWA).
- `build_apk.py` — собирает `AndroidManifest.xml` и `resources.arsc` в бинарном виде, без Android SDK/Gradle,
  собирает dex через apktool, упаковывает и подписывает (APK Signature Scheme v1 + v2 + v3).

Требования: Android 5.0 (API 21) и выше; разрешения — интернет.

## Ограничения

- Игра требует интернета: оболочка открывает страницу с сервера. После первого входа мобильная версия
  кэшируется сервис-воркером, поэтому часть офлайн-режима работает.
- Сервер на бесплатном Render засыпает; первый запуск после простоя может занять до ~60 с (как и в браузере).
- Оболочка собрана без Android Studio и не проверялась на реальном устройстве в этой среде;
  перед публикацией установите APK на телефон и пройдитесь по основным экранам.

#!/bin/bash
# Сборка APK настоящими инструментами Android SDK (aapt2 + javac + d8 + zipalign + apksigner).
# Нужны: JDK 11+, build-tools (aapt2, d8.jar, apksigner.jar, zipalign), android.jar платформы.
set -e
cd "$(dirname "$0")"
T=${TOOLS:-$HOME/apkbuild-tools}; BT=${BT:-$T/android-14}; AJ=${ANDROID_JAR:-$T/android-34/android.jar}
KS=${KS:-$T/dragonmania.jks}; PASS=${DML_KS_PASS:-dragonmania}
rm -rf build; mkdir -p build/res build/classes build/gen
$BT/aapt2 compile --dir res -o build/res.zip
$BT/aapt2 link -o build/base.apk -I "$AJ" --manifest AndroidManifest.xml --java build/gen build/res.zip --auto-add-overlay
javac -encoding UTF-8 -source 1.8 -target 1.8 -bootclasspath "$AJ:$BT/core-lambda-stubs.jar" -cp "$AJ" -d build/classes $(find build/gen src -name '*.java')
java -cp $BT/lib/d8.jar com.android.tools.r8.D8 --release --lib "$AJ" --min-api 21 --output build $(find build/classes -name '*.class')
cp build/base.apk build/unsigned.apk && (cd build && zip -q -u unsigned.apk classes.dex)
$BT/zipalign -f 4 build/unsigned.apk build/aligned.apk
[ -f "$KS" ] || "$(dirname "$(readlink -f "$(which java)")")/keytool" -genkeypair -keystore "$KS" -storetype PKCS12 -storepass "$PASS" -alias dragonmania -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Dragonmania, O=Dragonmania, C=BY"
java -jar $BT/lib/apksigner.jar sign --ks "$KS" --ks-pass pass:$PASS --out build/dragonmania.apk build/aligned.apk
java -jar $BT/lib/apksigner.jar verify --verbose build/dragonmania.apk | head -5
ls -la build/dragonmania.apk

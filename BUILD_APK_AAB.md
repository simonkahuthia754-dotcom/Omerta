# Omerta - Build & Deployment Guide

## APK & AAB Building Instructions

### Prerequisites Checklist
- ✅ Node.js v16+ installed
- ✅ Java JDK 11+ installed
- ✅ Android SDK installed
- ✅ Android Studio installed
- ✅ Google Play Developer account (for AAB deployment)

---

## Step 1: Prepare Your Project

```bash
# Install dependencies
npm install

# Build the web assets
npm run build

# Verify build output exists
ls -la dist/
```

---

## Step 2: Add Capacitor Android Platform

```bash
# Add Android platform
npx cap add android

# Sync files to Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

---

## Step 3: Update Android Configuration

### Update `capacitor.config.json`
```json
{
  "appId": "com.omerta.game",
  "appName": "Omerta",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "Admob": {
      "appId": "ca-app-pub-1268492465575554~2328637637"
    }
  }
}
```

### Update `android/app/build.gradle`
```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.omerta.game"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
}

dependencies {
    implementation 'androidx.core:core-splashscreen:1.0.1'
    implementation 'com.google.android.gms:play-services-ads:22.6.0'
}
```

### Update `android/app/src/main/AndroidManifest.xml`
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
        android:debuggable="false"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">
        
        <!-- Google AdMob -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-1268492465575554~2328637637"/>
        
        <activity android:name=".MainActivity" />
    </application>
</manifest>
```

---

## Step 4: Configure Signing Keys

### Create a Keystore (First time only)
```bash
keytool -genkey -v -keystore omerta-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias omerta-key
```

**Keep this file safe!** You'll need it for all future updates.

### Store Keystore Credentials
Create `android/keystore.properties`:
```properties
storeFile=omerta-release.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=omerta-key
keyPassword=YOUR_KEY_PASSWORD
```

### Update `android/app/build.gradle`
```gradle
android {
    // ... existing config ...
    
    signingConfigs {
        release {
            storeFile file('../keystore.properties')
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## Step 5: Build APK

### Debug APK (for testing)
```bash
cd android
./gradlew assembleDebug

# APK location: app/build/outputs/apk/debug/app-debug.apk
```

### Release APK (for distribution)
```bash
cd android

# Set environment variables
export KEYSTORE_PASSWORD="your_password"
export KEY_ALIAS="omerta-key"
export KEY_PASSWORD="your_password"

# Build release APK
./gradlew assembleRelease

# APK location: app/build/outputs/apk/release/app-release.apk
```

---

## Step 6: Build AAB (For Google Play Store)

### Release AAB
```bash
cd android

# Set environment variables
export KEYSTORE_PASSWORD="your_password"
export KEY_ALIAS="omerta-key"
export KEY_PASSWORD="your_password"

# Build release AAB
./gradlew bundleRelease

# AAB location: app/build/outputs/bundle/release/app-release.aab
```

---

## Testing the Build Locally

### Install Debug APK on Device/Emulator
```bash
# Connect your device or start an emulator first
adb install app/build/outputs/apk/debug/app-debug.apk

# Launch the app
adb shell am start -n com.omerta.game/.MainActivity
```

### Test AdMob
1. App should show banner ads at the bottom
2. Ads refresh every 30 seconds
3. Check Logcat for AdMob messages:
```bash
adb logcat | grep -i admob
```

### Common Build Errors

#### Error: "Could not find com.google.android.gms"
```bash
# Update gradle wrapper version in android/gradle/wrapper/gradle-wrapper.properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.2-bin.zip
```

#### Error: "SDK location not found"
```bash
# Create local.properties in android/ folder
echo "sdk.dir=/path/to/android/sdk" > local.properties
```

#### Error: "Keystore was tampered with"
```bash
# Regenerate keystore if password is lost
keytool -genkey -v -keystore omerta-release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias omerta-key
```

---

## Step 7: Upload to Google Play Store

### Prepare for Release
1. Create app listing in [Google Play Console](https://play.google.com/console)
2. Set up store listing (description, screenshots, etc.)
3. Configure pricing and distribution

### Upload AAB
1. Go to Google Play Console → Omerta app
2. Navigate to Release → Production
3. Click "Create new release"
4. Upload `app-release.aab`
5. Review and publish

---

## Monitoring & Analytics

### Check Build Logs
```bash
cd android
./gradlew --stacktrace bundleRelease

# Save logs for debugging
./gradlew bundleRelease > build.log 2>&1
```

### Monitor App Performance
After publishing, track:
- AdMob revenue in [Google AdMob Console](https://admob.google.com)
- Downloads and crashes in [Google Play Console](https://play.google.com/console)
- User feedback and ratings

---

## Troubleshooting Checklist

| Issue | Solution |
|-------|----------|
| Build fails to compile | Run `./gradlew clean` then rebuild |
| AdMob ads not showing | Verify App ID in AndroidManifest.xml |
| App crashes on launch | Check logcat: `adb logcat \| grep ERROR` |
| Keystore errors | Verify credentials in keystore.properties |
| Play Store rejection | Check app signing certificate matches Play Console |

---

## CI/CD Integration (Optional)

### GitHub Actions Workflow
Create `.github/workflows/build-android.yml`:

```yaml
name: Build Android

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - uses: actions/setup-java@v3
        with:
          java-version: '11'
          distribution: 'adopt'
      
      - run: npm install
      - run: npm run build
      - run: npx cap sync android
      - run: cd android && ./gradlew bundleRelease
      
      - uses: actions/upload-artifact@v3
        with:
          name: app-bundle
          path: android/app/build/outputs/bundle/release/
```

---

## Security Checklist

- ✅ Never commit `keystore.properties` to Git
- ✅ Never commit `.keystore` file to public repos
- ✅ Use environment variables for sensitive data
- ✅ Enable ProGuard/R8 obfuscation (minifyEnabled: true)
- ✅ Set debuggable to false in release builds
- ✅ Review app permissions in AndroidManifest.xml

---

## Version Management

### Update Version for Release
Edit `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 2  // Increment for each release
    versionName "1.0.1"  // Semantic versioning
}
```

---

## Next Steps

1. **Build Debug APK**: Test on device/emulator
2. **Fix any errors**: Use build logs to debug
3. **Build Release AAB**: For Google Play
4. **Upload to Play Store**: Submit for review
5. **Monitor metrics**: Track downloads, crashes, revenue

---

**Need help?** Check logs with:
```bash
cd android
./gradlew bundleRelease --info > detailed_build.log
cat detailed_build.log | tail -100
```


# Transformer Gbairai PWA en Application Mobile APK

## Méthodes disponibles

### 1. PWA Wrapper avec Capacitor (Recommandé)

#### Installation Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npx cap init
```

#### Configuration capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gbairai.app',
  appName: 'Gbairai',
  webDir: 'client/dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#F7C948",
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
```

#### Ajout de la plateforme Android

```bash
npx cap add android
```

#### Configuration Android

Éditer `android/app/src/main/AndroidManifest.xml` :

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
    
    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
</manifest>
```

#### Build et génération APK

```bash
# Build web
npm run build

# Synchroniser avec Capacitor
npx cap sync

# Ouvrir Android Studio
npx cap open android
```

Dans Android Studio :
1. Build > Generate Signed Bundle/APK
2. Choisir APK
3. Créer ou sélectionner keystore
4. Build release APK

### 2. Avec Cordova (Alternative)

#### Installation

```bash
npm install -g cordova
cordova create gbairai-mobile com.gbairai.app Gbairai
cd gbairai-mobile
```

#### Configuration config.xml

```xml
<?xml version='1.0' encoding='utf-8'?>
<widget id="com.gbairai.app" version="1.0.0" xmlns="http://www.w3.org/ns/widgets">
    <name>Gbairai</name>
    <description>Réseau social ivoirien</description>
    <author email="contact@gbairai.com" href="https://gbairai.com">Gbairai Team</author>
    
    <content src="index.html" />
    <access origin="*" />
    
    <platform name="android">
        <allow-intent href="market:*" />
        <icon density="ldpi" src="res/icon/android/ldpi.png" />
        <icon density="mdpi" src="res/icon/android/mdpi.png" />
        <icon density="hdpi" src="res/icon/android/hdpi.png" />
        <icon density="xhdpi" src="res/icon/android/xhdpi.png" />
    </platform>
    
    <plugin name="cordova-plugin-geolocation" />
    <plugin name="cordova-plugin-camera" />
    <plugin name="cordova-plugin-file" />
</widget>
```

#### Build

```bash
cordova platform add android
cordova build android --release
```

### 3. PWA Builder (Microsoft)

#### En ligne

1. Aller sur [PWABuilder.com](https://www.pwabuilder.com)
2. Entrer l'URL de votre PWA déployée
3. Cliquer "Start"
4. Sélectionner "Android"
5. Télécharger le package APK

#### Avec CLI

```bash
npm install -g @pwabuilder/cli
pwa-build --platform android --url https://votre-app.com
```

## Configuration PWA optimale pour mobile

### 1. Manifest.json amélioré

```json
{
  "name": "Gbairai - Réseau Social Ivoirien",
  "short_name": "Gbairai",
  "description": "Partagez vos émotions sur une carte interactive",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#F7C948",
  "background_color": "#1D3557",
  "categories": ["social", "lifestyle"],
  "screenshots": [
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 2. Service Worker avec cache

```javascript
const CACHE_NAME = 'gbairai-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/icons/icon-192x192.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

## Optimisations pour mobile

### 1. Performance

- Lazy loading des composants
- Code splitting
- Compression des images
- Cache approprié

### 2. UX Mobile

- Touch targets 44px minimum
- Gestures natifs
- Feedback haptique
- Navigation adaptée

### 3. Fonctionnalités natives

```typescript
// Géolocalisation
if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(position => {
    // Utiliser position
  });
}

// Notifications
if ('Notification' in window) {
  Notification.requestPermission();
}

// Installation PWA
window.addEventListener('beforeinstallprompt', event => {
  // Proposer installation
});
```

## Distribution

### 1. Google Play Store

1. Signer l'APK avec keystore
2. Créer compte développeur Google Play
3. Uploader l'APK
4. Remplir les métadonnées
5. Publier

### 2. Distribution directe

- Héberger l'APK sur votre serveur
- Permettre "Sources inconnues" sur Android
- Installation manuelle

### 3. Alternative stores

- Amazon Appstore
- Samsung Galaxy Store
- F-Droid (pour open source)

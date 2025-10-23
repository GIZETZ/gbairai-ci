
# Configuration Firebase pour Gbairai

## Prérequis
- Compte Firebase
- Project Firebase créé

## Installation des dépendances Firebase

```bash
npm install firebase firebase-admin
```

## Configuration

### 1. Initialiser Firebase

```bash
npm install -g firebase-tools
firebase login
firebase init
```

### 2. Configuration Firestore

Créer `server/firebase.ts` :

```typescript
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = require('../firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

export const db = getFirestore();
```

### 3. Adapter le storage

Créer `server/firebaseStorage.ts` :

```typescript
import { db } from './firebase';
import { User, Gbairai, Interaction } from '@shared/schema';

export class FirebaseStorage {
  async createUser(userData: any): Promise<User> {
    const userRef = db.collection('users').doc();
    const user = { ...userData, id: userRef.id };
    await userRef.set(user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const snapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as User;
  }

  async createGbairai(gbairaiData: any): Promise<Gbairai> {
    const gbairaiRef = db.collection('gbairais').doc();
    const gbairai = { 
      ...gbairaiData, 
      id: gbairaiRef.id,
      createdAt: new Date()
    };
    await gbairaiRef.set(gbairai);
    return gbairai;
  }

  async getGbairais(): Promise<Gbairai[]> {
    const snapshot = await db.collection('gbairais')
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Gbairai);
  }

  // Autres méthodes...
}
```

### 4. Variables d'environnement

Ajouter à `.env` :

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
```

### 5. Mise à jour du server

Dans `server/index.ts`, remplacer l'import du storage :

```typescript
import { FirebaseStorage } from './firebaseStorage';
const storage = new FirebaseStorage();
```

## Règles de sécurité Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /gbairais/{gbairaiId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == resource.data.userId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

# APFLOW V3 — CRM Automobile Auto Partner

Application de gestion commerciale et pilotage pour Key Account Managers (KAM), Managers, Directeurs et Super Admin d'Auto Partner.

---

## 🚀 Fonctionnalités Principales

- **Espaces Dédiés & Cloisonnés** :
  - **KAM** : Accès uniquement à son portefeuille clients et ses notes confidentielles.
  - **Manager** : Supervision de son équipe de KAMs avec consolidation du CA et des clients.
  - **Directeur** : Supervision de l'ensemble du réseau, attribution des KAMs aux managers.
  - **Super Admin** : Gestion intégrale des comptes, permissions granulaires, création et réinitialisation de mots de passe.
- **Pilotage CA Global** : Suivi des objectifs, réalisations par client, répartition par ville, import CSV.
- **Visites Terrain & Re-visites** : Radar des relances, cadence personnalisée, compte-rendu terrain.
- **Recherche Globale Instantanée** : Filtre sur clients, code AP, notes et comptes-rendus de visite.

---

## ⚙️ Prérequis

- **Node.js** 18.18+ ou 20+
- **npm**, **pnpm** ou **yarn**

---

## 🛠️ Variables d'Environnement

Créez un fichier `.env` à la racine (ou configurez vos variables sur Vercel / Railway / Render) :

```env
DATABASE_URL="file:./prisma/dev.db"
# En cas d'utilisation d'une base PostgreSQL / MySQL en production :
# DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
```

---

## 📦 Installation & Déploiement

### 1. Installation des dépendances
```bash
npm install
```

### 2. Initialisation de la base de données
```bash
npx prisma db push
```

### 3. Build de production
```bash
npm run build
```

### 4. Démarrage en production
```bash
npm run start
```

---

## ☁️ Déploiement en 1 Clic (Vercel)

1. Connectez votre compte GitHub sur [vercel.com](https://vercel.com).
2. Importez le dépôt `YoucefKadd/app-autopartner-flow`.
3. Ajoutez la variable d'environnement `DATABASE_URL` (si hébergement cloud externe comme Supabase, Neon, Turso ou SQLite local persistant).
4. Cliquez sur **Deploy**.
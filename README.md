# 💐 Site de partage de photos de mariage

Un site tout simple, au style champêtre et vert sauge, pour permettre à vos invités
d'envoyer leurs photos et vidéos du mariage directement depuis leur téléphone, en
scannant un QR code. Les fichiers sont stockés dans un bucket **Google Cloud Storage**.

Les invités n'ont pas besoin de compte, ni d'application : ils scannent le QR code,
arrivent sur la page, et déposent leurs photos. Ils peuvent revenir en envoyer
d'autres plus tard, ça fonctionne à tout moment (avant, pendant ou après le mariage).

## Comment ça marche

- La page (`/`) affiche vos prénoms, la date, un message d'accueil et une zone
  d'envoi de photos/vidéos (glisser-déposer ou sélection depuis l'appareil).
- Quand un invité envoie un fichier, le site demande au serveur une **URL signée**
  temporaire (`/api/sign-upload`), puis envoie le fichier **directement** vers votre
  bucket Google Cloud Storage. Le fichier ne passe jamais par un serveur intermédiaire,
  ce qui évite les limites de taille et rend l'envoi plus rapide.
- Le prénom de l'invité (facultatif) est enregistré comme métadonnée du fichier, pour
  savoir plus tard qui a pris telle ou telle photo.
- Il n'y a pas de galerie publique : personne ne peut voir les photos des autres,
  seuls les mariés y ont accès via la console Google Cloud.

## 1. Configuration de Google Cloud

Il vous faut un bucket Google Cloud Storage et un compte de service ayant le droit
d'y écrire. Le niveau gratuit de Google Cloud (5 Go de stockage, quelques dizaines de
milliers d'écritures) est largement suffisant pour un mariage.

1. **Créer un projet** sur [console.cloud.google.com](https://console.cloud.google.com/)
   (ou réutiliser un projet existant).
2. **Activer l'API Cloud Storage** : menu *API et services* → *Bibliothèque* →
   rechercher "Cloud Storage API" → *Activer*.
3. **Créer un bucket** : menu *Cloud Storage* → *Buckets* → *Créer* :
   - Nom unique, ex. `mariage-camille-antoine`
   - Région proche de vous (ex. `europe-west1` pour la Belgique/France)
   - Classe de stockage : *Standard*
   - Contrôle d'accès : *Uniforme*, et laissez la **prévention d'accès public activée**
     (les photos ne doivent pas être publiques — seule l'URL signée permet l'envoi).
4. **Créer un compte de service** : menu *IAM et administration* → *Comptes de
   service* → *Créer un compte de service* :
   - Nom : ex. `mariage-upload`
   - Rôle : `Storage Object Admin` (ou, plus restrictif, `Storage Object Creator`)
     — vous pouvez limiter ce rôle au bucket créé ci-dessus plutôt qu'au projet entier.
5. **Créer une clé JSON** pour ce compte de service : ouvrez le compte de service →
   onglet *Clés* → *Ajouter une clé* → *Créer une clé* → format *JSON*. Un fichier
   `.json` est téléchargé : **gardez-le secret**, ne le commitez jamais dans Git.
6. **Encoder la clé en base64** (pour la mettre dans une variable d'environnement) :

   ```bash
   base64 -w0 chemin/vers/la-cle.json
   ```

   (sur Mac, sans `-w0` : `base64 -i chemin/vers/la-cle.json`)

   Copiez le résultat, vous en aurez besoin à l'étape suivante.

7. **Configurer le CORS du bucket** pour autoriser l'envoi direct depuis votre site.
   Modifiez le fichier `cors.json` fourni à la racine du projet en remplaçant
   `https://votre-site.exemple.com` par l'URL réelle de votre site (vous pouvez
   revenir faire cette étape une fois le site déployé), puis appliquez-le :

   ```bash
   gcloud storage buckets update gs://VOTRE_BUCKET --cors-file=cors.json
   ```

## 2. Configuration du projet

1. Copiez `.env.example` en `.env.local` et remplissez les deux variables :

   ```bash
   cp .env.example .env.local
   ```

   ```
   GCS_BUCKET_NAME=mariage-camille-antoine
   GCS_SERVICE_ACCOUNT_KEY_BASE64=<collez ici la valeur obtenue à l'étape 6>
   ```

2. Personnalisez les textes du site dans [`src/config/site.ts`](src/config/site.ts) :
   prénoms, date, message d'accueil, message de remerciement, taille maximale des
   fichiers (200 Mo par défaut).

3. La couleur (vert sauge) et les polices sont définies dans
   [`src/app/globals.css`](src/app/globals.css) si vous souhaitez ajuster les teintes.

## 3. Lancer le site en local

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). Tant que `.env.local` est bien
rempli, vous pouvez tester un envoi réel de photo depuis votre ordinateur.

## 4. Déployer le site (Vercel, recommandé)

1. Poussez ce dépôt sur GitHub (déjà fait si vous lisez ceci depuis GitHub 🙂).
2. Sur [vercel.com](https://vercel.com), *Add New* → *Project* → importez le dépôt.
3. Dans les paramètres du projet Vercel, section *Environment Variables*, ajoutez :
   - `GCS_BUCKET_NAME`
   - `GCS_SERVICE_ACCOUNT_KEY_BASE64`
4. Déployez. Vercel vous donne une URL du type `https://mariage-xxxx.vercel.app`
   (vous pouvez ensuite y attacher un nom de domaine personnalisé si vous en avez un).
5. Reprenez l'étape "Configurer le CORS du bucket" ci-dessus avec cette URL définitive.

> Toute autre plateforme capable d'exécuter une application Next.js (Cloud Run,
> Netlify, un VPS avec `npm run build && npm run start`…) fonctionne aussi.

## 5. Générer le QR code

Une fois le site déployé, générez un QR code aux couleurs du site pointant vers votre
URL :

```bash
npm run qr -- https://mariage-xxxx.vercel.app
```

Deux fichiers sont créés dans le dossier `qr-code/` :

- `qr-code.png` — pour l'imprimer directement (fond transparent, haute résolution)
- `qr-code.svg` — pour l'intégrer dans un carton d'invitation ou un design imprimé

Imprimez-le sur des petites affiches à poser sur les tables, ou glissez-le dans le
livret de la cérémonie, avec un mot du type *"Scannez-moi pour partager vos photos !"*

## 6. Récupérer les photos après le mariage

Toutes les photos et vidéos sont dans le bucket, sous `uploads/AAAA-MM-JJ/…`. Pour
tout télécharger d'un coup :

```bash
gcloud storage cp --recursive gs://VOTRE_BUCKET/uploads ./photos-mariage
```

Vous pouvez aussi les parcourir directement depuis la
[console Google Cloud Storage](https://console.cloud.google.com/storage/browser).

## Formats acceptés

Photos : JPEG, PNG, WebP, HEIC/HEIF, GIF. Vidéos : MP4, MOV (QuickTime), WebM.
La taille maximale par fichier est définie dans `src/config/site.ts`
(`maxFileSizeMb`, 200 Mo par défaut).

## Stack technique

- [Next.js](https://nextjs.org/) (App Router) + TypeScript + Tailwind CSS
- Upload direct navigateur → Google Cloud Storage via URL signées v4
- Aucune base de données : les métadonnées (prénom de l'invité) sont stockées
  directement sur les fichiers dans GCS

# isthatyouremail

Inbox Gmail colorée selon tes bases Airtable. À la réponse, l’alias Gmail lié à la BDD est présélectionné.

Pas de base de données maison : Gmail et Airtable restent les sources de vérité. Hébergement prévu sur **Netlify Starter** (gratuit).

## 1. Configurer les bases Airtable

Édite [`config/bases.json`](config/bases.json) :

```json
{
  "id": "acad",
  "label": "ACAD",
  "baseId": "appXXXXXXXX",
  "table": "Contacts",
  "emailField": "Email",
  "color": "#1e3d34",
  "gmailAlias": "acad@votredomaine.fr"
}
```

- `baseId` : dans l’URL Airtable (`airtable.com/app…`).
- `table` / `emailField` : nom exact de la table et du champ email.
- `color` : couleur de la ligne dans l’inbox.
- `gmailAlias` : adresse déjà ajoutée dans Gmail → Paramètres → Comptes → **Envoyer des e-mails en tant que**.

Crée un [Personal Access Token](https://airtable.com/create/tokens) Airtable avec `data.records:read` et `data.records:write` sur ces bases (l’écriture sert uniquement aux cases `Désabonnement Gazette` et `Désabonnement Cours en ligne`).

## 2. Google Cloud (OAuth Gmail)

1. Crée un projet sur [Google Cloud Console](https://console.cloud.google.com/).
2. Active **Gmail API**.
3. Écran de consentement OAuth : type **Externe**, statut **Test**, ajoute uniquement des comptes **@clic-et-moi.com** comme utilisateurs de test. L’app refuse tout autre Google (Gmail perso inclus) : sans ça, n’importe quelle session ouvrirait les bases Airtable.
4. Identifiants → **ID client OAuth** → application Web.
5. URI de redirection :
   - local : `http://localhost:3000/api/auth/callback/google`
   - Netlify : `https://TON-SITE.netlify.app/api/auth/callback/google`
6. Scopes demandés par l’app : lecture Gmail, envoi, liste des alias « send as ».

## 3. Lancer en local

```bash
cp .env.example .env.local
```

Remplis :

| Variable | Rôle |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | client OAuth |
| `AUTH_ALLOWED_DOMAINS` | domaines de login (défaut `clic-et-moi.com`) |
| `AUTH_ALLOWED_EMAILS` | optionnel : adresses hors domaine (prestataires) |
| `AIRTABLE_PAT` | token Airtable |

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) → **Continuer avec Google**.

## 4. Déployer sur Netlify

1. Relie le repo Git (build command `npm run build`, plugin Next.js déjà dans `netlify.toml`).
2. Variables d’environnement : les mêmes que `.env.example`, avec `AUTH_URL=https://TON-SITE.netlify.app`.
3. Ajoute l’URI de callback Netlify dans Google Cloud.
4. `git push` → l’app est sur `*.netlify.app`.

Les fonctions Starter timeout vers 10 s : l’inbox ne charge que 20 mails, et Airtable n’est interrogé que pour les expéditeurs de cette page (cache 5 min).

Les pages `/inbox` redirigent déjà si tu n’es pas connecté.

Après une mise à jour des droits Gmail (libellés / dossiers), **déconnecte-toi puis reconnecte-toi** pour accepter `gmail.modify`.

## Hors périmètre

Pas de CRUD contacts, pas de clone Gmail complet, pas d’écriture dans Airtable. Pour ajouter un contact, fais-le dans Airtable : il sera reconnu au prochain lookup.

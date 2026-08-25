# V33 — Messagerie Google Workspace

- OAuth individuel, sans mot de passe Gmail stocké.
- Portée Gmail limitée à `gmail.modify`.
- Jetons chiffrés en AES-256-GCM ; politiques RLS par utilisateur.
- Les messages restent dans Gmail. Supabase conserve les liens CRM et traces d'envoi.
- L'administrateur gère l'accès au module sans pouvoir lire la boîte d'un autre utilisateur.

## Installation

1. Exécuter `supabase/migrations/033_gmail_individual_mailboxes.sql` dans Supabase.
2. Activer Gmail API dans Google Cloud et créer un client OAuth « Application Web ».
3. URI de redirection : `https://crm.im-energie.com/api/email/google/callback`.
4. Dans Vercel ajouter `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `EMAIL_TOKEN_ENCRYPTION_KEY` et `NEXT_PUBLIC_APP_URL=https://crm.im-energie.com`.
5. Redéployer, puis ouvrir **Messagerie > Connecter avec Google**.

Génération de la clé : `openssl rand -base64 32`. Les notifications Gmail Push sont différées ; la boîte est actualisée à l'ouverture ou avec le bouton Actualiser.

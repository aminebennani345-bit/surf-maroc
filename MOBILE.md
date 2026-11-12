# SurfCoast sur l'App Store et le Google Play Store

L'appli mobile embarque la web app telle quelle (index.html, app.js…) dans une coquille native
[Capacitor](https://capacitorjs.com/). Le site GitHub Pages reste la source : chaque modification
du site part aussi dans l'appli au prochain build.

## Ce qui tourne tout seul

Le workflow **Appli mobile** (onglet *Actions*) se lance à chaque push sur `main`, sur les pull
requests, ou à la main (*Run workflow*). Il produit :

| Artefact | À quoi ça sert |
|---|---|
| `surfcoast-android-test-apk` | APK à installer directement sur un téléphone Android pour tester |
| `surfcoast-android-playstore-aab` | Fichier à envoyer sur Google Play (seulement si la clé de signature est configurée) |
| Job **iOS** | Vérifie que l'appli iPhone compile (pas encore de fichier envoyable : il faut le compte Apple) |

Pour sortir une nouvelle version : augmente `"version"` dans `package.json` (ex. `1.0.1`).
Le numéro de build augmente tout seul à chaque exécution.

## Clé de signature Android

Google exige que chaque fichier envoyé soit signé avec ta « clé d'importation ». Le workflow la lit
dans 4 secrets du dépôt (*Settings → Secrets and variables → Actions*) :

- `ANDROID_KEYSTORE_BASE64` : le fichier de clé, encodé en base64
- `ANDROID_KEYSTORE_PASSWORD` : son mot de passe
- `ANDROID_KEY_ALIAS` : le nom de la clé dans le fichier
- `ANDROID_KEY_PASSWORD` : le mot de passe de la clé (identique au précédent pour un fichier .p12)

Garde une copie du fichier et des mots de passe en lieu sûr. Avec la signature d'applications Play
(activée par défaut), une clé perdue peut être réinitialisée depuis la Play Console, mais c'est long.

## Google Play : étapes

1. Crée un compte développeur sur [play.google.com/console](https://play.google.com/console)
   (25 $, une seule fois) et fais vérifier ton identité.
2. *Créer une application* : nom « SurfCoast », langue français, appli gratuite.
3. Fiche du Store : description, captures d'écran (au moins 2 en format téléphone),
   icône 512 px (`icons/icon-512.png`), image de présentation 1024×500.
4. Règles de confidentialité :
   `https://aminebennani345-bit.github.io/surf-maroc/privacy.html`
5. Sécurité des données : **aucune donnée collectée ni partagée**. Pas de pub, classification
   « Tout public ».
6. **Test fermé obligatoire** pour les comptes personnels créés après le 13 novembre 2023 :
   au moins **12 testeurs inscrits sans interruption pendant 14 jours**, avant de pouvoir
   demander l'accès à la production. Envoie le fichier `.aab` dans le test fermé et invite tes
   potes surfeurs (adresses Gmail).
7. Après les 14 jours : *Demander l'accès à la production*, puis publier.

## App Store : étapes

1. Inscris-toi à l'[Apple Developer Program](https://developer.apple.com/programs/) (99 $ par an).
2. Dans [App Store Connect](https://appstoreconnect.apple.com/), crée l'appli avec l'identifiant
   `io.github.aminebennani345.surfcoast`.
3. Signature : il faut un certificat de distribution et un profil d'approvisionnement. Avec un Mac,
   le plus simple est d'ouvrir le projet dans Xcode (`npx cap add ios && npx cap open ios`) et de
   faire *Product → Archive → Distribute*. Sans Mac, ces éléments peuvent être ajoutés en secrets
   pour que le job iOS signe et envoie l'appli tout seul.
4. Fiche : captures iPhone 6,9", URL de confidentialité ci-dessus, questionnaire de confidentialité
   « Données non collectées ».

**Point de vigilance Apple** : la règle 4.2 (« fonctionnalités minimales ») refuse les applis qui ne
font que reprendre un site web. SurfCoast a de vrais atouts (calcul des scores sur l'appareil,
fonctionnement hors-ligne, notes de session), mais ajouter une fonction native, par exemple une
**notification quand une session ≥ 8/10 s'annonce**, augmente nettement les chances de validation.

## Données Open-Meteo

L'API gratuite d'Open-Meteo est réservée à un usage non commercial : une appli gratuite, sans pub ni
abonnement, entre dans ce cadre. Les données sont sous licence CC-BY 4.0, d'où la mention
« Données : Open-Meteo » dans l'appli. Si l'appli devient payante ou affiche de la pub, il faudra un
abonnement Open-Meteo.

## En local (facultatif)

```bash
npm ci
npm run build:web
npx cap add android        # ou ios, sur un Mac
npm run assets:android     # icônes et écran de démarrage
npx cap open android       # ouvre Android Studio
```

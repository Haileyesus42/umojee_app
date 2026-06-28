# Umojee Mobile

Cross-platform Expo app for Android, iOS, and web.

## Quick start

```bash
npm install
npm run start
```

Use Expo Go for fast device testing, or run a platform target:

```bash
npm run android
npm run ios
npm run web
```

## Quality gates

Run these before every PR and before every build:

```bash
npm run typecheck
npm run lint
npm run prettier:check
npm run tests
```

Format the project with:

```bash
npm run format
```

## Deployment

1. Sign in to Expo:

```bash
npx eas-cli login
```

2. Initialize the project once:

```bash
npx eas-cli init
```

3. Build preview Android APKs for internal testing:

```bash
npm run build:android:preview
```

4. Build production binaries:

```bash
npm run build:android:production
npm run build:ios:production
```

5. Submit to stores after configuring credentials:

```bash
npm run submit:android
npm run submit:ios
```

## Notes

- `app.json` includes stable native identifiers: `com.ndit.umojee`.
- `eas.json` includes development, preview, and production profiles.
- Keep secrets out of git. Use EAS secrets or local `.env*.local` files.

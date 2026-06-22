# Baraha Mess — Flutter Android App

Mobile client for the Baraha Bad Boys Mess web app. Uses the **same Cloudflare API** as the web — no separate backend.

**Production API:** `https://barahamess-2025.ibrahimhumayun0614.workers.dev`

## Safe to try / easy to undo

This folder is **isolated**. It does not change `worker/`, `wrangler.jsonc`, or live Durable Object data.

To remove everything added for Flutter:

```bash
# From repo root — delete mobile app + CI workflow only
git clean -fd mobile/
git checkout -- .gitignore
rm -rf .github/workflows/build-android.yml
```

Or revert the commit that added the mobile app:

```bash
git revert <commit-hash>
```

## Build locally

Requires [Flutter](https://docs.flutter.dev/get-started/install) and Android Studio.

The production URL is the default — no extra flags needed:

```bash
cd mobile
flutter pub get
flutter run
flutter build apk --release
```

APK output: `build/app/outputs/flutter-apk/app-release.apk`

For local dev against Vite (port 3000):

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

(`10.0.2.2` is the Android emulator's alias for your PC's localhost.)

## Build with GitHub Actions

Push changes under `mobile/` or run **Actions → Build Android App → Run workflow**.

Download the APK from the workflow **Artifacts** section.

The workflow uses the production URL by default. Override with a repository secret `API_BASE_URL` if needed.

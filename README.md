# What makes a great map app?

A map app built live at an Esri Australia workshop on 24 November 2026, from the room's survey answers, using the
[ArcGIS Maps SDK for JavaScript](https://developers.arcgis.com/javascript/) 5.2 and
[Calcite](https://developers.arcgis.com/calcite-design-system/) components, in the Victorian Government's default colours (colours only, no branding).

- `app/`: the site GitHub Pages serves. No build step.
  - `config.js` and `features/` are what the live build changes.
  - `catalogue.json` is the vetted list of public layers the build may use.
- `scripts/serve.mjs`: local preview on http://localhost:5180.
- `scripts/check.mjs`: pre-push checks, which also run in the deploy workflow.
- `CLAUDE.md`: the rules Claude follows on stage.

## One-time setup (before the day)

1. Push this folder to `chrislandvogt/Locate_SDK` on `main` (public, so Pages is free). The app will be at https://chrislandvogt.github.io/Locate_SDK/.
2. Set Settings > Pages > Source to **GitHub Actions**.
3. Under Settings > Secrets and variables > Actions, add:
   - Secrets: `FOUNDRY_URL`, `FOUNDRY_KEY` (the **capped workshop key**), and `FOUNDRY_MODEL` if needed.
   - **Don't set `ARCGIS_API_KEY` to the wall's key.** That key can read the private survey results, and anything in this app is public. The app works without a key (it uses keyless Esri tiles). If you want vector basemaps, create a **separate** key with basemap access only, restricted to `chrislandvogt.github.io`.
   - Variables: `FOUNDRY_LABEL=Sol 6.1`, and `FOUNDRY_AUTH=api-key` or `bearer`.
4. Push the rehearsed build to a `backup` branch.

## After the session

Regenerate the Foundry keys, or delete the workshop deployment, and remove the `FOUNDRY_KEY` secret.

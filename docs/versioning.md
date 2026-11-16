# Versioning

The version has three parts: MAJOR.MINOR.PATCH.

| Change | Bump | Example |
|---|---|---|
| Rebuild, or a change that breaks how the app is used or set up | MAJOR | 0.3.0 to 1.0.0 |
| New feature or visible improvement | MINOR | 0.1.0 to 0.2.0 |
| Bug fix or wording only | PATCH | 0.1.0 to 0.1.1 |

The version must match in three places: `package.json`, the top of `CHANGELOG.md` and the **Current version** line in `README.md`. Each release is also published as a GitHub release.

One rule is specific to this app. If `lib/search.js`, the weights or the data change, run `npm run evaluate` before the release. The scorecard and the README table must show the new numbers.

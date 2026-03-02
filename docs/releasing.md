# リリース手順

## 1. バージョン更新

以下の 2 箇所のバージョン番号を更新する:

- `package.json` — `"version"` フィールド
- `src/index.ts` — `const VERSION = "X.Y.Z"`

## 2. ビルド

```bash
npm run build
```

## 3. 検証

```bash
npm run verify
```

format / lint / typecheck / test / build がすべて通ることを確認する。

## 4. CHANGELOG.md 更新

`CHANGELOG.md` に新バージョンのセクションを追加する。

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...
```

直前リリースからの差分は `git log vPREV..HEAD --oneline` で確認できる。

## 5. コミット & タグ作成

```bash
git add -A
git commit -m "release: vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
git tag -f v1
```

`v1` タグはメジャーバージョンのフローティングタグ。Action の利用者が `uses: ...@v1` で最新を追従できるようにする。

## 6. Push

```bash
git push origin main
git push origin vX.Y.Z
git push origin v1 --force
```

## 7. GitHub Release

`release.yml` ワークフローがタグプッシュ (`v[0-9]+.[0-9]+.[0-9]+*`) をトリガーに自動で GitHub Release を作成する。

- セマンティックバージョンタグのみがトリガー対象
- タグ名に `alpha`, `beta`, `rc`, `dev` を含む場合は prerelease としてマークされる
- `dist/index.js` と `dist/licenses.txt` がリリースアセットとして添付される

## 注意事項

- スキャナーバイナリ (gitleaks, osv-scanner 等) の更新手順は別途 runbook を参照

# GP-007: 利用統計の把握方法（2026-03-06）

## 結論

GuardPRの利用統計は **Proユーザーの明示的オプトイン時のみ** 送信する。
Communityユーザーの既定動作は従来どおり外部送信なし。

## 採用方式

- 入力: `pro-api-key` が設定されている場合のみ送信処理を有効化する。
- 送信先: 固定エンドポイント `https://api.guardpr.dev/webhook`（ユーザー設定不可）。
- 送信タイミング: スキャン/集計/PR処理完了後に1回POST。
- 障害時挙動: Webhook送信失敗は警告ログのみ（Action失敗にはしない）。

## 送信データ（Allowlist）

- finding件数（total/high/low）
- severity/category分布
- scanner実行メタデータ（id/status/count/duration）
- patch統計（total/tests passed/tests failed）
- PR作成結果（created/url/number）
- 実行メタデータ（repository, sha, ref, actor, event, runId, version, total duration）

## 非送信データ（Denylist）

- ソースコード本文
- `codeSnippet` / `description` / `rawData`
- patch差分 (`diff`, `modifiedContent`)
- secret値、トークン値（`githubToken`, `pro-api-key`含む）

## 実装整合の更新点

- `src/config/defaults.ts` に固定Pro endpointを定義。
- YAML/Action inputからendpointを受け付けない（SSRF防止）。
- docs記述（固定endpoint、Community既定、Proオプトイン）と実装を一致させる。

## 検証結果

- `npm run typecheck`: 成功
- `npm run test:unit -- test/unit/webhook/payload.test.ts test/unit/config/loader.test.ts test/unit/audit/logger.test.ts`: 成功
- `npm run test:unit -- test/unit/webhook/sender.test.ts`: 成功（ローカルHTTPサーバーを使う送信/リトライケースを確認）。

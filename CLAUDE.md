# CLAUDE.md — Agent Guidance for `led-board`

This file is the source of truth for how AI agents (Claude Code and similar) should approach work on this project. Read it in full before making changes.

## Project Overview

`led-board` (LED 電光掲示板) はブラウザ上で動く LED ドットマトリクス電光掲示板シミュレータ。
ゼロバックエンド・オフラインファースト PWA。スクリーンセーバー的に全画面で流しっぱなしにする用途を想定。
イベント会場の案内表示、配信オーバーレイ、店頭看板、部屋の雰囲気作り、駅構内案内の再現など。

ベスト・イン・クラスのモダンな TypeScript 実装、厳格 TDD、core 100% カバレッジ、本当に必要な依存だけを採用する。

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime / PM | Bun ≥ 1.3 (workspaces) | 単一ツール、ネイティブ TS、最速インストール |
| Language | TypeScript strict | `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` |
| Bundler | Vite | DX 最良、PWA プラグイン成熟 |
| UI Framework | Solid 1.9 | 最小バンドル、細粒度リアクティビティ、no VDOM |
| Lint / Format | Biome 2.4 | 単一ツール、ESLint+Prettier の 10-100× 高速 |
| Tests | Vitest 4 + happy-dom 15+ + fast-check 4 | ネイティブ ESM、property test |
| Coverage | @vitest/coverage-v8 | V8 ネイティブ、core で 100% 強制 |
| Mutation testing | @stryker-mutator/core 9 + vitest-runner | テストスイートの品質指標 |
| Contracts | hand-rolled `contracts.ts` (zero deps) | `requires`/`ensures`/`invariant` を TS `asserts` predicates で |
| PWA | vite-plugin-pwa + Workbox 7 | 業界標準オフラインファースト |
| Rendering | Canvas 2D + OffscreenCanvas (ネイティブ) | 依存なし、スプライトキャッシュ + drawImage パターン |
| Fullscreen | Fullscreen API (unprefixed) | Promise ベース、`webkit*` プレフィックス drop |
| Wake Lock | Screen Wake Lock API | Baseline 2025、`navigator.wakeLock.request('screen')` |
| Animation | requestAnimationFrame + delta time | FPS 非依存 (Chris Wilson "A tale of two clocks") |
| Storage | localStorage + `navigator.storage.persist()` | 設定 ~10 件には十分 |
| CI | GitHub Actions | Pages デプロイをネイティブサポート |

**Backend**: なし。100% クライアントサイド。

**明示的に却下**: React, Tailwind, Redux/Zustand, ESLint, Prettier, Jest, Storybook, Turborepo, Tauri, Wails, WebGL/three.js (本用途には過剰), canvas chart libs, NoSleep.js (Wake Lock API で代替), webfonts.

## TDD Policy (Mandatory for `packages/core`)

**RED → GREEN → REFACTOR**:

1. 次の振る舞いを記述する **失敗するテスト** を書く
2. `bun test` を実行し、**意図した理由で失敗** することを確認
3. テストを通すための **最小コード** を書く
4. `bun test` を実行し、green を確認
5. テストが green のまま **リファクタ** (rename, extract, simplify)
6. このサイクルを 1 コミット

**Coverage targets** (CI で強制):
- `packages/core/src/**`: **100%** lines/branches/functions/statements
- `packages/web/src/**`: 95%+ (entrypoint と generated code は除外)

カバーできない行は削除する。残さざるを得ない場合は明示的な exemption コメントと PR 説明での justification を必須とする。

## テスト方針 (Quality Strategy)

- 正常系だけでなく **境界値と異常系** を必ず含める
- assertion には **人間が読めるメッセージ** または expressive な test name を付ける
- public 関数には **事前条件・事後条件を `requires`/`ensures` で明記** する (`@led/core` の `contracts.ts`)。`invariant` はクラス内の状態遷移用
- **property-based test** を `fast-check` で積極的に使う。アルゴリズムの法則 (round-trip, idempotency, monotonicity, involution, oracle, 不変保存) を優先表現する
- **mutation score** を品質指標として参照する (`bun run mutation`)。core の目標値は **90%+**
- 契約 (`requires`/`ensures`) は production の防御コードではなく **仕様の宣言** である。「不可能な状態への防御を入れない」原則と矛盾しない: 契約は呼び出し側との約束を明文化するもので、内部実装の冗長な防御ではない

## Multi-Agent Post-Implementation Review (3 Rounds)

各 feature が green になった後、3 ラウンドのレビューを別エージェント呼び出しで実行する。発見事項は feature コミットとは別のコミットにする。

### Round 1 — Correctness & Performance
- 実装は spec とテストに一致しているか?
- 境界条件 (off-by-one、wraparound)?
- ホットパス: `LedRenderer.draw` 内で不要なアロケはないか?
- 10 分間スクロールしても GC ヒッチが見えないか?
- long-frame p99 < 20ms?
- glyph cache hit rate > 99% (warmup 後)?
- sprite atlas が色変更で thrash しないか?

### Round 2 — Optimization & Simplification
- 任意のモジュールはもっと小さくできるか?
- 任意の型はもっとシャープにできるか?
- dead code? speculative generality?
- 抽象を inline できるか? (YAGNI チェック)

### Round 3 — Edge Cases & Defensive Coding
- グリッド境界 (1×1, 64×16, 128×32, 256×128)?
- 空シーケンス (黒画面)?
- フォント未収録のコードポイント (絵文字 → tofu)?
- フルスクリーン拒否 (ユーザがブロック)?
- wakeLock 拒否 (低バッテリー)?
- localStorage 無効 (private mode)?
- ResizeObserver が初回ペイント前に発火?
- DPR=3 の Retina ディスプレイ?
- IME composition 中のテキスト編集?
- visibilitychange (タブ離脱) で wake lock 解放?
- service worker 登録失敗?

## Coding Conventions

### Universal
- **すべてのコアロジックは純粋関数で**。副作用は edge (canvas adapter, persistence, DOM) に局在
- **イミュータブルデータ**。型フィールドに `readonly`、テストでは `Object.freeze` で変異を検知
- **Web Standards over libraries**。`URL`, `crypto.randomUUID`, `structuredClone`, `AbortController`, `Intl.NumberFormat`, `Intl.DateTimeFormat` はネイティブ — 使う
- **No `any`**。`unknown` を narrow する
- **No default exports** (例外: `main.tsx`, `vite.config.ts`, `*.config.*`, Web Workers)。Named exports は grep しやすく refactor に強い
- **No barrel files deeper than `packages/*/src/index.ts`**。中間 `index.ts` は依存を隠す
- **時期尚早の抽象化を避ける**。2 回目の使用で inline、3 回目で extract
- **File size**: < 200 行を推奨。**Function size**: < 40 行を推奨
- **Comments**: *why* を説明する、*what* ではない。明白なコードにコメント不要
- **Error handling**: 期待されるエラーは discriminated union、`throw` はプログラマエラーのみ。`packages/core` で `try/catch` 禁止
- **No `console.log`** (Biome で強制; `console.warn`/`error` のみ許可)
- **Early return / early continue** でネストを浅く
- **Naming**: 短く意味のある名前 (`x`, `y`, `cols`, `rows`, `pitch`, `glyph`)。1 文字名や cryptic 略語 (`sz`, `indeg`) は避ける
- **標準ライブラリ優先**。`Array.prototype.*`, `Map`, `Set`, `Intl.*` を再発明しない
- **Ternaries** は `if`/`else` より明確なことが多い

### Web Specific
- **CSS**: `tokens.css` のカスタムプロパティ経由のみ。インラインスタイル禁止。utility CSS フレームワーク禁止
- **Canvas コードは `packages/web/src/canvas/` に集約**。draw ループ内で DOM read 禁止 (ResizeObserver でキャッシュ)
- **Accessibility (non-negotiable)**:
  - 全インタラクティブ要素はキーボード操作可能
  - 全アイコン専用ボタンに `aria-label`
  - フォーカス状態は `--focus-ring` で可視化
  - テキストは ≥ 4.5:1、UI は ≥ 3:1 のコントラスト
  - アニメーションは `prefers-reduced-motion` を尊重 (LED ボードのスクロールはコンテンツなので除外)

### Performance-Critical Paths (Frame Draw)
- `LedRenderer.draw()` の中でアロケ禁止 (no `new`, no spread, no per-cell closure)
- core の `PixelBuffer` はフレーム間で再利用、再アロケしない
- sprite atlas の invalidation は明示的 — draw パスの中で再生成しない
- 固定サイズの数値データには `Uint8Array` を使う (`number[]` 不可)
- インナーループで `ctx.save()` / `restore()` 禁止、状態変更はバッチ
- DPR ≤ 2 にキャップ (4K Retina で過剰アロケ防止)

## File Structure

詳細は `docs/ARCHITECTURE.md` 参照。高レベル:

- `packages/core/` — 純粋 TypeScript ドメイン。zero browser/DOM/canvas dependencies。100% test coverage
- `packages/web/` — Solid + Vite + PWA。`canvas/` と `state/` で core をブラウザに適合
- `tools/` — ビルド時スクリプト (BDF → 独自バイナリ font 変換など)
- `.github/workflows/` — CI/CD パイプライン
- `docs/` — Architecture, performance, font license
- `DESIGN.md` — ビジュアルデザインの単一の真実 (`packages/web/src/components/` や `styles/` を触る前に必読)

## Commands

```bash
# install
bun install

# dev
bun run dev               # vite dev server
bun run build             # build all packages

# test
bun run test              # all tests
bun run test:core         # core only
bun run test:web          # web only
bun run test:watch        # vitest watch mode
bun run test:coverage     # full coverage report + threshold check

# quality
bun run lint              # biome check
bun run lint:fix          # biome check --write
bun run format            # biome format --write
bun run typecheck         # tsc -b (all workspaces)

# mutation testing (Stryker on packages/core)
bun run mutation          # ~5 minutes; HTML report at packages/core/reports/mutation/

# tools
bun run build:font        # download & convert k8x12L BDF to runtime binary

# everything
bun run ci                # lint && typecheck && test:coverage && build

# preview production build
bun run preview
```

## Reference Policy

**API、パターン、設定を採用する前に必ず公式ドキュメントを参照する**。情報源が衝突した場合は公式が優先。

- Bun: https://bun.sh/docs
- Vite: https://vitejs.dev/guide/
- Solid: https://docs.solidjs.com/
- Biome: https://biomejs.dev/guides/
- Vitest: https://vitest.dev/guide/
- vite-plugin-pwa: https://vite-pwa-org.netlify.app/
- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- Canvas optimization: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- OffscreenCanvas: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- Fullscreen API: https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
- Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- requestAnimationFrame (Chris Wilson, "A tale of two clocks"): https://web.dev/articles/audio-scheduling
- fast-check: https://fast-check.dev/
- DESIGN.md convention: https://github.com/VoltAgent/awesome-design-md

## Working with this Repo

- `DESIGN.md` を読まずに UI コードに触るな (デザインは全て tokens 由来)
- このファイルを読まずに `packages/core` に触るな (TDD policy は non-negotiable)
- 既存の tech stack 表に対する正当化なしに依存を追加するな
- 新しい色・フォント・スペーシングを `DESIGN.md` への提案なしに導入するな
- PR を出す前にローカルで `bun run ci` を通すこと
- フォントライセンスは `docs/FONT.md` で確認すること

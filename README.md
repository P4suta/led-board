# LED 電光掲示板

[![CI](https://github.com/P4suta/led-board/actions/workflows/ci.yml/badge.svg)](https://github.com/P4suta/led-board/actions/workflows/ci.yml)
[![Deploy](https://github.com/P4suta/led-board/actions/workflows/deploy.yml/badge.svg)](https://github.com/P4suta/led-board/actions/workflows/deploy.yml)
[![CodeQL](https://github.com/P4suta/led-board/actions/workflows/codeql.yml/badge.svg)](https://github.com/P4suta/led-board/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> ブラウザで動く **LED ドットマトリクス電光掲示板シミュレータ**。
> PWA としてインストール可能、フルスクリーンでスクリーンセーバー的に使える。
>
> A browser-based LED dot-matrix sign board simulator. PWA-installable, fullscreen-capable, ambient/screensaver-friendly.
>
> 🌐 **Live**: <https://p4suta.github.io/led-board/>

---

## 特徴 / Features

- 🚉 **本物の駅電光掲示板の質感** — ピクセルごとに発光プロファイル、ハロ、色温度勾配を再現
- 🇯🇵 **フル日本語対応** — JIS X 0208 Level 1+2 をカバー (常用漢字 + ひらがな + カタカナ)、約 7,170 文字
- 🎨 **クラシック LED カラー** — 赤・橙・JR橙・緑・青・暖白の物理的に正確な OKLCH カラー
- ⚡ **モダンスタック** — TypeScript strict / Solid 1.9 / Vite 6 / Bun 1.3 / Biome 2.4 / Vitest 4
- 🧪 **TDD ベース** — `packages/core` は **100% カバレッジ強制** + property test + 契約プログラミング
- 📺 **フルスクリーン + Wake Lock** — 画面スリープを抑止して常時表示
- 💾 **オフラインファースト PWA** — Workbox で全アセットをプリキャッシュ
- 🎛️ **複数の表示モード** — 横スクロール / 静止 / 時計

---

## 使い方 / Quick start

### Prerequisites

- [Bun](https://bun.sh/) 1.3 以上

### 開発サーバー

```bash
bun install
bun run dev
# → http://localhost:5173/led-board/
```

### ビルド

```bash
bun run build
# → packages/web/dist/
bun run preview   # ローカルで本番ビルドを確認
```

### テスト & 品質チェック

```bash
bun run ci        # lint + typecheck + test:coverage + build
bun run test      # テストのみ
bun run test:core # core パッケージのテストのみ (100% カバレッジ強制)
bun run lint:fix  # Biome auto-fix
```

---

## キーボードショートカット

| Key | Action |
|---|---|
| `F` | フルスクリーン on/off |
| `Esc` | フルスクリーン解除 / モーダル閉じ |
| `?` (`Shift+/`) | キーボードヘルプを開く |

---

## アーキテクチャ

```
led-board/
├── packages/
│   ├── core/                 # 純粋ドメイン (zero DOM, 100% test coverage)
│   │   ├── src/
│   │   │   ├── pixel-buffer/    # 4-bit grayscale LED grid
│   │   │   ├── font/            # ビットマップフォント (LBFB バイナリフォーマット)
│   │   │   ├── text/            # レイアウト + blit
│   │   │   ├── scroll/          # ドリフトレス横スクロール
│   │   │   ├── clock/           # 時計レンダラ + キャッシュ
│   │   │   ├── scene/           # Scene 判別共用体 + ディスパッチャ
│   │   │   ├── sequence/        # シーンシーケンスエンジン
│   │   │   ├── effects/         # ブリンク / フェード
│   │   │   ├── time/            # Clock interface (FakeClock for tests)
│   │   │   └── contracts.ts     # requires/ensures/invariant
│   │   └── assets/
│   │       ├── k8x12.bin        # 8×12 ドット日本語フォント (~120 KB)
│   │       └── misaki.bin       # 8×8 ドット日本語フォント (~92 KB)
│   └── web/                  # Solid + Vite + PWA
│       └── src/
│           ├── canvas/          # LedRenderer + sprite atlas + DPR
│           ├── components/      # Solid components
│           ├── hooks/           # useFullscreen, useWakeLock, useStoredSignal, ...
│           ├── state/           # Solid signals + localStorage 永続化
│           ├── font/            # Vite ?url ベースのフォントローダ
│           └── styles/          # tokens.css (DESIGN.md と同期)
├── tools/
│   ├── build-font.ts         # TTF → LBFB バイナリ変換 (build-time)
│   └── gen-icons.ts          # PWA アイコン生成
├── docs/
│   └── FONT.md               # フォントの出典・ライセンス・フォーマット
├── CLAUDE.md                 # AI エージェント向けガイドライン
├── DESIGN.md                 # ビジュアルデザインシステム (駅前ビジョン)
└── .github/workflows/        # CI + GitHub Pages デプロイ
```

詳しくは `CLAUDE.md` (開発方針) と `DESIGN.md` (デザインシステム) を参照。

---

## フォントクレジット

このプロジェクトは Num Kadoma 氏作の以下のフリーフォントを同梱しています:

- [k8x12L](https://littlelimit.net/k8x12.html) — 8×12 ドット日本語ビットマップフォント
- [美咲ゴシック (Misaki Gothic)](https://littlelimit.net/misaki.htm) — 8×8 ドット日本語ビットマップフォント

両フォント共に商用利用・再配布自由のフリーソフトウェアです。詳細は `docs/FONT.md` 参照。

---

## ライセンス

本プロジェクト本体のコードは MIT License で配布される予定。
バンドルされているビットマップフォントは元の Num Kadoma 氏のライセンス (フリー / 自由再配布可) に従います。

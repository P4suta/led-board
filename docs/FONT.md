# フォントアセット — `packages/core/assets/`

LED ボード上の文字描画には**ビットマップフォント**を使う。OS のシステムフォントを LED ボードに描画することはない (CSS フォントスタックは LED 領域には適用されない)。これはフォントの**出典・ライセンス・ビルド方法**を記録するためのドキュメント。

## 同梱フォント

| 名称 | サイズ | 用途 | 出典 | ファイル |
|---|---|---|---|---|
| **k8x12L** | 8×12 ドット | デフォルト・標準サイズ | https://littlelimit.net/k8x12.html | `packages/core/assets/k8x12.bin` |
| **美咲ゴシック (Misaki)** | 8×8 ドット | ミニ LED・店頭看板 | https://littlelimit.net/misaki.htm | `packages/core/assets/misaki.bin` |

両フォント共に **JIS X 0208 Level 1 + Level 2** をサポートし、**常用漢字を全て含む** 約 7,170 文字をカバーする。

## ライセンス

両フォント共に **Copyright (C) Num Kadoma** によるフリーフォント。アーカイブ同梱のライセンス文を引用:

> These fonts are free software.
> Unlimited permission is granted to use, copy, and distribute them, with or without modification, either commercially or noncommercially.
> THESE FONTS ARE PROVIDED "AS IS" WITHOUT WARRANTY.
>
> これらのフォントはフリー（自由な）ソフトウエアです。
> あらゆる改変の有無に関わらず、また商業的な利用であっても、自由にご利用、複製、再配布することができますが、全て無保証とさせていただきます。

つまり**商用利用・再配布・改変いずれも自由**。`packages/core/assets/*.bin` への変換物の同梱・再配布も問題ない。

## ビルド方法

オリジナルの TTF ファイルはリポジトリには含まれていない。`tools/build-font.ts` がビルド時に TTF を読み、ピクセルレンダリングして独自バイナリ (LBFB フォーマット) に変換する。

### 前提

- TTF ファイルを `/tmp/led-fonts/k8x12/k8x12L.ttf` と `/tmp/led-fonts/misaki/misaki_gothic.ttf` に配置
  - https://littlelimit.net/k8x12.html から `k8x12_ttf_*.zip` をダウンロード
  - https://littlelimit.net/misaki.htm から `misaki_ttf_*.zip` をダウンロード
- `bun install` 済み (build スクリプトは `@napi-rs/canvas` と `opentype.js` に依存)

### コマンド

```bash
bun run build:font
```

これで両フォントの `.bin` が `packages/core/assets/` に再生成される。

### 個別生成

```bash
bun run tools/build-font.ts <input.ttf> <output.bin> <cellWidth> <cellHeight> <fontName>
# 例:
bun run tools/build-font.ts /tmp/led-fonts/k8x12/k8x12L.ttf packages/core/assets/k8x12.bin 8 12 k8x12L
```

## バイナリフォーマット (LBFB v1)

`packages/core/src/font/binary.ts` 参照。リトルエンディアン:

```
offset  size  field
──────  ────  ─────
  0      4    magic = "LBFB" (0x4C 0x42 0x46 0x42)
  4      1    version = 1
  5      1    cellWidth (pixels)
  6      1    cellHeight (pixels)
  7      1    nameLength (bytes, max 255)
  8      4    glyphCount (uint32)
 12      4    bytesPerGlyph (uint32) = ceil(cellWidth / 8) * cellHeight
 16      N    name (UTF-8, nameLength bytes)
 16+N    4*C  codepoints (uint32 * glyphCount, sorted ascending)
 16+N+4C C    advances (uint8 * glyphCount)
 16+N+5C BPG*C  bitmaps (bytesPerGlyph bytes per glyph)
```

ビット配置: 行優先、各バイト内 MSB ファースト。 ピクセル `(x, y)` は バイト `(y * bytesPerRow + (x >> 3))` のビット `(7 - (x & 7))` に格納。

ルックアップは codepoint のソート済み配列に対する **二分探索 (O(log n))**。

## サイズ予算

| フォント | グリフ数 | バイナリサイズ | gzip 後の見積 |
|---|---|---|---|
| k8x12 (8×12) | 7,164 | ~120 KB | ~50 KB |
| misaki (8×8) | 7,164 | ~92 KB | ~35 KB |

合計でも 250 KB 未満。PWA バンドルへの影響は無視できる。

## 既知の制限

- **横幅は 4 (半角) または 8 (全角) のみ**。プロポーショナルフォントは未対応 (オリジナルが等幅なので問題なし)
- **アンチエイリアシングなし**。ビットマップフォントなので 1bit/pixel
- **絵文字 (Unicode emoji) は未収録**。ルックアップ時に **tofu (空ボックス)** が返る
- **縦書き未対応**

## 将来の追加候補

- **東雲ゴシック 16** (16×16): 大型ボード用。サイズ ~220 KB。
  - 出典: https://openlab.ring.gr.jp/efont/shinonome/
  - ライセンス: パブリックドメイン
- **Misaki Mincho** (8×8): 明朝体。日本語の表情を変える。
  - 既に同梱 (`misaki_mincho.ttf`) — `bun run tools/build-font.ts ... ` で個別生成可能
- **k8x12S** (8×8 仮名 + 漢字): k8x12 の半角仮名版

# DESIGN.md — 駅前ビジョン Station Display Design System

> [DESIGN.md convention](https://github.com/VoltAgent/awesome-design-md) 準拠。AI エージェントと人間の貢献者は UI を生成する前に必ずこのファイルを読むこと。
> ここで宣言したトークンは `packages/web/src/styles/tokens.css` に同期される。新しい色・フォント・スペーシングを提案する場合は、まずこのファイルに追加し、次に `tokens.css` を更新する。
>
> **このアプリはデザインが全て** — LED の物理的なリアリティとミニマルなコントロールクロームの両立が成否を決める。

## 1. Visual Theme & Atmosphere

**Theme name**: **駅前ビジョン (Eki-mae Vision) / Station Display**

**Mood**: 駅構内、街頭ビジョン、店頭の OPEN 看板 — 都市インフラの匿名な発光体。発車メロディの記憶、夜の渋谷スクランブル、終電後のホームの寂しさ、秋葉原の電飾の密度。レトロでも未来でもない「現役の業務用ハードウェア」の質感。

**Inspiration**:
- JR 山手線のホーム LED 案内表示器 (16 ドット高、JR Orange + 白文字)
- ATOS (Autonomous Decentralized Train Control) 駅構内表示
- Tokyo Metro 行先表示器 (路線色 + 種別 + 行先の三層レイアウト)
- 秋葉原ヨドバシカメラ屋上 LED ビジョン
- 渋谷スクランブル交差点 Q-Front の街頭フルカラー LED
- 店頭の赤 LED 「営業中」「閉店」プレート
- 80 年代パチンコ屋の電光看板の生々しい光
- JR West の 2011 年 i-design LED 案内システム (色覚多様性対応カラーパレット)

**Density**: 二極化。コントロールクロームは Linear や iA Writer のような「ストイック・モノクロ・ジェネラスな余白」。LED ボードは「物理的な密度」 — ピクセルが詰まり、光が滲み、オフドットが薄くまだら模様を作る。

**Philosophy**: 電光掲示板はインフラであってエンタメではない。時代の証言者であって主役ではない。UI は完全に消える、LED だけが残る。**「眺めていられる」**ことが全て。

## 2. Visual Authenticity — LED の物理的リアリティ

> このセクションが本アプリの最重要部分。CGI っぽい LED ではなく、**実物の LED マトリクスパネル**に見えなければならない。

### LED ドットの構造

各 LED ドットは以下の特徴を持つ:
- **中央が最も明るく、外周に向けて滑らかに減光する radial gradient** (実物の LED は cone-shaped emission)
- **滲み (halation/bleeding)**: 隣接ドットへの微弱な光漏れ。canvas filter `blur(${pitch * 0.15}px)` で再現
- **オフドットの可視化**: 完全な真っ黒ではない。ハウジング素材の質感を保つため `oklch(15% 0.01 ${hue}) * 0.1` 程度の極弱発光。これが**現役感**を生む決定的要素
- **温度勾配**: 温色 (赤・オレンジ・アンバー) は中央が暖色、外周に向かって僅かに彩度低下。寒色 (青・白) は中央が冷色、外周に向かって僅かにグレー化
- **視野角コサイン則**: ドット中心からの距離に比例した強度減衰

### スプライト生成の擬似コード

```ts
function renderLedSprite(ctx: OffscreenCanvasRenderingContext2D, opts: {
  diameter: number;
  color: { c: number; h: number };
  intensity: number; // 0..1
}): void {
  const { diameter, color, intensity } = opts;
  const r = diameter / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0,    `oklch(${85 * intensity}% ${color.c} ${color.h})`);
  grad.addColorStop(0.5,  `oklch(${65 * intensity}% ${color.c} ${color.h} / 0.85)`);
  grad.addColorStop(0.85, `oklch(${40 * intensity}% ${color.c} ${color.h} / 0.45)`);
  grad.addColorStop(1.0,  `oklch(${15 * intensity}% ${color.c} ${color.h} / 0.05)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, diameter, diameter);
}
```

**16 段階の輝度** (0..15) でフェード/ブリンク/スクロールのアンチエイリアシングを表現する。

### グロー (Halation) の合成

ボード全体描画後に二段重ねでグロー追加:

```ts
// pass 1: blur で halation 層
visibleCtx.filter = `blur(${pitch * 0.15}px)`;
visibleCtx.globalCompositeOperation = 'screen';
visibleCtx.globalAlpha = 0.6;
visibleCtx.drawImage(dotsCanvas, 0, 0);

// pass 2: シャープな本体
visibleCtx.filter = 'none';
visibleCtx.globalCompositeOperation = 'source-over';
visibleCtx.globalAlpha = 1;
visibleCtx.drawImage(dotsCanvas, 0, 0);
```

`globalCompositeOperation = 'screen'` で光の加算を物理的に再現。これにより明るいドットの周囲が「光の靄」をまとう。

### サブピクセル走査線 (オプション)

物理 LED マトリクスはアレイ駆動のため微弱な走査線がときどき見える。ボード全体に `linear-gradient` で 1px の走査線を `mix-blend-mode: overlay` で重ねると一気に「実機感」が増す。デフォルト OFF、設定で ON に。

## 3. Color Palette & Roles

**色空間は OKLCH を採用**。理由: 同じ Lightness 値で hue を変えても知覚輝度がほぼ一定 (RGB/HSL は赤と青で見た目の明るさが大幅に異なる)。Linear, Tailwind v4, Radix Colors は全て LCH/OKLCH に移行済。
詳細: https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl

### 3.1 Chrome (UI) — Dark theme (default)

| Token | OKLCH | Hex (近似) | Role |
|---|---|---|---|
| `--bg` | `oklch(11% 0.005 240)` | `#0A0A0B` | アプリ背景 (Linear-inspired off-black; 純黒 #000 はドットのハロが強すぎる) |
| `--surface` | `oklch(15% 0.005 240)` | `#141416` | カード、パネル |
| `--surface-elevated` | `oklch(19% 0.006 240)` | `#1C1C20` | モーダル、ポップオーバー |
| `--surface-overlay` | `oklch(11% 0 0 / 0.6)` | — | フルスクリーン中のホバー UI 背景 (半透明) |
| `--border` | `oklch(28% 0.006 240)` | `#27272A` | 区切り線、入力枠 |
| `--border-strong` | `oklch(38% 0.008 240)` | `#3F3F46` | フォーカス時の枠 |
| `--text-primary` | `oklch(98% 0.003 100)` | `#FAFAF9` | 本文・主要表示 |
| `--text-secondary` | `oklch(70% 0.008 240)` | `#A1A1AA` | ラベル、補助テキスト |
| `--text-muted` | `oklch(55% 0.008 240)` | `#71717A` | プレースホルダ、無効状態 |
| `--accent` | `oklch(72% 0.18 65)` | `#FB923C` | 主 CTA、フォーカスリング (warm amber — 駅の JR Orange を彷彿) |
| `--accent-hover` | `oklch(80% 0.16 70)` | `#FDBA74` | ホバー |
| `--danger` | `oklch(70% 0.20 25)` | `#F87171` | 削除、警告 |
| `--success` | `oklch(75% 0.18 145)` | `#4ADE80` | 保存完了 |
| `--focus-ring` | `oklch(75% 0.20 65 / 0.6)` | — | `:focus-visible` 時の outline |

**`light-dark()` 関数を使ってライトテーマも併設可**。ただし v1 ではダーク固定 (LED ボードはダークでしか映えない)。
```css
:root { color-scheme: dark; }
```

### 3.2 LED Display Palette — クラシック電光掲示板カラー

> **重要**: `#FF0000` は実物の LED 赤に見えない (sRGB 純赤は知覚的に紫を含む)。実物の LED 赤は ~607nm のオレンジ寄り赤で、これは sRGB では `#FF2A00` 近辺になる。

| Token | OKLCH | Hex | Inspiration |
|---|---|---|---|
| `--led-red` | `oklch(65% 0.24 32)` | `#FF2A00` | 駅構内警告、店頭 CLOSED、パチンコ屋の真紅 |
| `--led-amber` | `oklch(80% 0.18 75)` | `#FFAE00` | 駅構内案内、カウション |
| `--led-jr-orange` | `oklch(72% 0.19 55)` | `#FF8C00` | JR Orange (JR East ブランドカラー) |
| `--led-green` | `oklch(85% 0.27 145)` | `#00DD33` | 「営業中」、信号、安全 |
| `--led-blue` | `oklch(65% 0.20 245)` | `#0066FF` | 補足情報、案内補助 |
| `--led-white` | `oklch(96% 0.02 85)` | `#FFF5E6` | warm white、駅の主要表示。**純白 #FFFFFF は冷たすぎるので避ける** |
| `--led-cool-white` | `oklch(96% 0.005 240)` | `#F5F5FA` | 街頭ビジョン白 (cool white) |

**off-dot color** はフォアグラウンドカラーの 8% 輝度 (`color-mix(in oklch, var(--led-${color}) 8%, var(--bg))`)。完全な黒ではない。これが**実機感**の核。

### 3.3 Color Universal Design (色覚多様性対応)

JR West の 2011 年 i-design に倣い、deuteranopia / protanopia でも red と green を区別できる組合せを採用:
- 赤系: pure red ではなく **オレンジ寄りの red** (`#FF2A00`) で黄色みを残す
- 緑系: pure green ではなく **黄色寄りの green** (`#00DD33`) で輝度を上げる
- 警告は red **だけで** 表現せず、必ずブリンクや位置 (上部) も併用

## 4. Typography

### 4.1 Chrome — システムフォント (zero network request)

```css
:root {
  --font-ui: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", "Segoe UI", "Inter", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono", "Source Han Code JP", Menlo, Consolas, monospace;
}
```

**全数値表示に `font-variant-numeric: tabular-nums`** を必須とする (cols、rows、速度など)。

### 4.2 Type scale (rem-based)

| Token | Size | Weight | Family | Usage |
|---|---|---|---|---|
| `--type-display` | `clamp(2.5rem, 8vw, 5rem)` | 700 | mono | フルスクリーン中のヘッダラベル (時計の代替表示など) |
| `--type-h1` | `1.75rem` | 600 | ui | アプリタイトル「LED 電光掲示板」 |
| `--type-h2` | `1.25rem` | 600 | ui | パネルセクションヘッダ |
| `--type-body` | `1rem` | 400 | ui | コントロール、ラベル、説明 |
| `--type-small` | `0.875rem` | 400 | ui | メタデータ、ヒント |
| `--type-micro` | `0.75rem` | 500 | ui | キーボードショートカット表示 |
| `--type-mono-input` | `0.9375rem` | 500 | mono | 数値入力 (cols, rows, speed) |

**Don't**: 14px 未満のフォントをモバイルで使わない。iOS でフォーカス時にズームされる。

### 4.3 LED Board のフォント (CSS は適用されない)

LED ボード上のグリフはすべて `packages/core/src/font/` のビットマップフォントから直接 PixelBuffer に焼き付けられる。CSS フォントスタックは LED ボードに**適用されない**。

| フォント | サイズ | 推奨用途 | カバレッジ |
|---|---|---|---|
| **k8x12L** (デフォルト) | 8×12 | 標準サイズ・スクリーンセーバ用途 | JIS X 0208 Level 1+2 |
| **美咲ゴシック** (Misaki) | 8×8 | ミニ LED、店頭看板の小サイズ | JIS X 0208 Level 1+2 |
| **東雲ゴシック 16** (Shinonome) | 16×16 | 大型ボード・遠景表示 | JIS X 0208 Level 1+2 |
| **Misaki Mincho** (オプション) | 8×8 | 明朝体タイポグラフィ | 同上 |

これらは全て自由に再配布可能なフリーフォント。出典とライセンスは `docs/FONT.md` 参照。

## 5. Component Stylings

### 5.1 `<Board>` — LED ディスプレイ本体

- 親コンテナの `aspect-ratio: var(--cols) / var(--rows)` で letterbox
- `max-width: 100vw; max-height: 100vh; object-fit: contain;`
- 周囲に **1px の `--border` ベゼル + 4px の inner shadow** で物理ハウジング感
- 背景は `--bg` ではなく `oklch(8% 0.01 240)` (やや暗めのプラスチック黒)
- **CSS filter は一切適用しない** (描画は LedRenderer が完全制御)
- フルスクリーン時はベゼル消失、`object-fit` のままでフルブリード

### 5.2 `<ControlPanel>` — 折りたたみサイドパネル

- 横長レイアウト: 左ドック、幅 `clamp(280px, 22vw, 360px)`、`border-right: 1px solid var(--border)`
- 縦長 (モバイル): 下部ボトムシート、`max-height: 60vh`、上端を drag handle で resize
- 折りたたみ時の幅: 0px (完全 unmount、`display: none` ではなく `<Show>`)
- 展開トリガ: 左端ホバー (cursor が画面左端 50px 以内に 0.4s 滞留 → スライドイン)
- 展開アニメ: `transform: translateX(-100%) → 0`, 220ms `cubic-bezier(0.32, 0.72, 0, 1)` (Apple HIG-derived)
- フルスクリーン中: 完全 unmount。クロームを取り戻すには Esc

### 5.3 `<SceneEditor>`

- セクションヘッダ「シーン編集」+ `--type-h2`
- フィールド構成 (上から):
  - **テキスト**: `<textarea>` 4 行、`font-family: var(--font-mono)`、`resize: vertical`、IME 確定対応
  - **モード**: `<SegmentedControl>` `[スクロール / 静止 / 時計 / 複数行]`
  - **速度**: `<Slider>` 0-200 px/sec、現在値表示 `tabular-nums`
  - **色**: `<ColorPicker>` LED パレット 6 色 + custom
  - **フォント**: `<select>` k8x12L / Misaki / Shinonome
  - **効果**: チェックリスト `[ブリンク / フェード / 走査線]`
- 各フィールドは `--space-4` (16px) の vertical gap
- バリデーション: 空文字のみ disable、長さ無制限

### 5.4 `<SequenceList>` — シーン並べ替え

- 縦リスト、各項目は drag handle + サムネ (LED ボード mini preview canvas) + テキスト snippet + duration badge
- ドラッグ並び替え: ネイティブ HTML5 DnD + キーボード代替 (Alt+↑/↓)
- 選択中項目: `border-left: 3px solid var(--accent)`、`background: var(--surface-elevated)`
- `Add scene` ボタン下端、`Remove` 各項目右端 (キーボード Delete 対応)

### 5.5 `<BoardConfigPanel>`

- cols `<NumberInput>` (1-256)
- rows `<NumberInput>` (1-128)
- ドット形状 `<SegmentedControl>` `[round / square / rounded]`
- ピクセル間隔 `<Slider>` 1-20px
- グロー強度 `<Slider>` 0-12
- 背景色 `<ColorPicker>` (subtle warm/cool)

### 5.6 `<FullscreenButton>`

- 右上、`44×44px` のアイコンボタン
- アイコンは inline SVG (フルスクリーン四角)、`aria-label="フルスクリーン"`、`aria-pressed`
- ホバー時 `background: color-mix(in oklch, var(--accent) 12%, transparent)`
- フォーカス時 `outline: 2px solid var(--focus-ring); outline-offset: 2px`

### 5.7 `<ColorPicker>`

- 6 色の固定パレット (LED トークン) + custom トリガ
- 各セルは `48×48px`、丸型、選択中は `--accent` 2px ring
- custom: ポップオーバーで oklch スライダー (Lightness, Chroma, Hue)

### 5.8 `<NumberInput>` `<Slider>` `<Toggle>` `<SegmentedControl>`

汎用入力。共通仕様:
- `min-height: 44px` (WCAG 2.5.5 AA → 24px、推奨 44px)
- `border-radius: var(--radius-md)` (8px)
- フォーカス時 `outline: 2px solid var(--focus-ring); outline-offset: 2px`
- 数値表示は `tabular-nums`

### 5.9 `<KeyboardHelp>`

- ネイティブ `<dialog>` 要素 + `showModal()`
- 中央モーダル、`max-width: 480px`
- ショートカット一覧 (table)、Esc / クリック背景で閉じる
- 開閉に View Transitions API (cross-fade)

### 5.10 `<AppHeader>`

- 高さ 56px、`border-bottom: 1px solid var(--border)`
- 左: アプリタイトル「LED 電光掲示板」`--type-h1`
- 右: `<InstallPrompt>` (条件表示) → `<KeyboardHelp>` トリガ → `<FullscreenButton>`
- フルスクリーン中: 完全に消える。マウスを画面上端 50px 以内に置くと 0.4s 後にスライドダウン

## 6. Layout Principles

### 6.1 Spacing scale (4px base)

```css
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
--space-5: 24px;  --space-6: 32px;  --space-7: 48px;  --space-8: 64px;  --space-9: 96px;
```

### 6.2 Border radius

```css
--radius-sm: 4px;  --radius-md: 8px;  --radius-lg: 16px;  --radius-full: 9999px;
```

### 6.3 Main layout (Desktop / wide)

```
┌──────────────────────────────────────────┐
│ AppHeader (56px)                         │
├──────────┬───────────────────────────────┤
│          │                               │
│ Control  │  Board (centered, letterbox)  │
│ Panel    │                               │
│          │                               │
│ 280-360  │                               │
│ px       │                               │
│          │                               │
└──────────┴───────────────────────────────┘
```

CSS:
```css
.app {
  display: grid;
  grid-template-rows: auto 1fr;
  grid-template-columns: minmax(280px, 22vw) 1fr;
  height: 100dvh;
}
.app:has(.fullscreen-active) {
  grid-template-columns: 1fr;
}
.app:has(.fullscreen-active) .control-panel { display: none; }
```

`100dvh` を使う理由: モバイル Safari の URL bar 出入りで 100vh が動的に変わる問題を回避。

### 6.4 Responsive breakpoints

```css
--bp-sm: 480px;  --bp-md: 768px;  --bp-lg: 1024px;  --bp-xl: 1440px;
```

- < 768px: コントロールパネルがボトムシートに変形
- >= 1440px: コントロールパネルが固定幅 360px

### 6.5 Container queries で内部レスポンシブ

```css
.scene-editor { container-type: inline-size; }
@container (min-width: 320px) {
  .scene-editor__color-picker { grid-template-columns: repeat(6, 1fr); }
}
```

`@container` は 2026 年現在 Chrome 105+, Firefox 109+, Safari 17+ で 95% カバー。

## 7. Depth & Elevation

```css
--shadow-1: 0 1px 2px 0 oklch(0% 0 0 / 0.30);
--shadow-2: 0 4px 8px -2px oklch(0% 0 0 / 0.40);
--shadow-3: 0 12px 24px -6px oklch(0% 0 0 / 0.50);
--shadow-inset: inset 0 1px 2px 0 oklch(0% 0 0 / 0.20);
```

階層:
- `--bg`: フラット
- `--surface` + `--shadow-1`: カード、パネル
- `--surface-elevated` + `--shadow-2`: モーダル、ポップオーバー
- `<Board>`: **shadow なし**、代わりに `border: 1px solid var(--border)` + `box-shadow: inset 0 0 0 4px oklch(8% 0 0)` で物理ベゼル

## 8. Motion & Animation

### 8.1 Easing

```css
--ease-standard: cubic-bezier(0.32, 0.72, 0, 1);   /* Apple HIG */
--ease-emphasized: cubic-bezier(0.05, 0.7, 0.1, 1.0); /* Material 3 */
--ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
```

### 8.2 Duration

```css
--dur-instant: 80ms;   /* button press */
--dur-fast: 160ms;     /* hover, focus */
--dur-standard: 240ms; /* panel slide */
--dur-slow: 400ms;     /* modal */
```

### 8.3 View Transitions for モーダル開閉

```css
::view-transition-old(modal),
::view-transition-new(modal) {
  animation-duration: var(--dur-standard);
  animation-timing-function: var(--ease-standard);
}
::view-transition-old(modal) { animation-name: fade-out; }
::view-transition-new(modal) { animation-name: fade-in; }
```

### 8.4 prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**LED ボード自体のスクロール/ブリンクは止めない**。それはコンテンツであってアニメーションではない (本物の駅の電光掲示板も止まらない)。`prefers-reduced-motion` はクロームの装飾アニメ (パネルスライド、ボタン pulse、modal scale) のみを無効化する。

## 9. Fullscreen Mode & Cursor Behavior

### 9.1 Fullscreen 入退場

- F キー or `<FullscreenButton>` クリックで `useFullscreen().enter()` を呼ぶ
- 入った瞬間: クロームを `<Show>` で完全 unmount、Wake Lock 取得
- 出る瞬間: クロームを再 mount、Wake Lock release
- Esc キーは Fullscreen API がブラウザレベルで処理 (`fullscreenchange` で検知)

### 9.2 Cursor auto-hide

研究 (NN/G timing): hover-reveal は 0.3-0.5s が最適、idle hide は 1-3s。

```ts
let hideTimer = 0;
function onMouseMove() {
  document.body.style.cursor = '';
  clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => { document.body.style.cursor = 'none'; }, 3000);
}
```

- カーソル動作 → カーソル即表示
- 3 秒静止 → `cursor: none`
- 3 秒静止 → クローム overlay も完全消失 (フルスクリーン中)

### 9.3 Edge-triggered control reveal (フルスクリーン中)

- マウスを画面上端 50px 以内に置く → 0.4s 後 AppHeader がスライドダウン
- マウスを画面左端 50px 以内に置く → 0.4s 後 ControlPanel がスライドイン
- マウスがその領域から外れる → 0.5s 後 hide

これにより**フルスクリーン中もコントロールに到達可能** (完全に閉じ込めない)。

## 10. Accessibility (WCAG 2.2 AA 準拠)

### 10.1 Contrast

- 通常テキスト: 4.5:1 以上 (1.4.3 AA)
- 大きいテキスト (18px 以上 or 14px bold): 3:1 以上
- UI コンポーネント (ボタン枠、フォーカスリング): 3:1 以上 (1.4.11 AA)

`--bg` (#0A0A0B) と `--text-primary` (#FAFAF9) のコントラスト比 = **約 18:1** (AAA)。
`--bg` と `--text-secondary` (#A1A1AA) = **約 8:1** (AAA)。

### 10.2 Focus Appearance (新規 2.4.13 AA)

```css
:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

太さ 2px ≥、コントラスト 3:1 ≥ を必ず満たす。

### 10.3 Target Size (2.5.5 / 2.5.8 AA)

最小 24×24 CSS pixels、推奨 44×44。本アプリは全インタラクティブ要素を 44×44 以上に揃える (例外: SequenceList 内の Delete ボタンは 32×32 だが clickable area を padding で 44×44 に拡張)。

### 10.4 Canvas のアクセシビリティ

`<canvas>` はスクリーンリーダから不可視。対策:
- `<canvas aria-label="LED ドットマトリクス表示、64列×16行" role="img">`
- `<canvas>` 直下に `<div aria-live="polite" class="sr-only">` を配置し、シーン切替時に「現在のシーン: 山手線 → 渋谷」とアナウンス
- `aria-live` 領域には Scene の生テキスト内容を流す (LED ボードの **意味** をスクリーンリーダに伝える)

### 10.5 Keyboard shortcuts

| Key | Action | 慣例 |
|---|---|---|
| `F` | フルスクリーン on/off | YouTube, VLC |
| `Space` | 再生/一時停止 | YouTube, VLC, Spotify |
| `N` | 次のシーン | (本アプリ独自) |
| `P` | 前のシーン | (本アプリ独自) |
| `←` `→` | 前/次のシーン (代替) | VLC |
| `E` | 編集モード切替 | (本アプリ独自) |
| `?` `Shift+/` | キーボードヘルプ | GitHub, Slack |
| `Esc` | フルスクリーン解除 / モーダル閉じ | Web 標準 |
| `Ctrl+S` | 設定を保存 (localStorage 強制 flush) | 慣例 |

`<KeyboardHelp>` モーダルで全リスト表示。**Tab 順は意味的な順序** (Play → Speed → Pattern → Fullscreen → Exit)。

### 10.6 prefers-color-scheme

ライトモードは v1 では非対応 (LED ボードはダーク前提)。
ただし `<html lang="ja">` と `color-scheme: dark only` を宣言してブラウザ UI も dark に揃える:
```css
:root { color-scheme: dark; }
```

## 11. Modern CSS Techniques (2026 standard)

### 11.1 Color functions

```css
/* light-dark() — テーマ自動切替 (将来用) */
color: light-dark(var(--text-primary-light), var(--text-primary-dark));

/* color-mix() — トークンから派生色を作る */
--accent-soft: color-mix(in oklch, var(--accent) 20%, var(--bg));
--accent-translucent: color-mix(in oklch, var(--accent) 60%, transparent);
```

### 11.2 `:has()` で親側の条件分岐

```css
.app:has(.fullscreen-active) .app-header { display: none; }
.field:has(input:invalid) { border-color: var(--danger); }
```

### 11.3 Container queries

```css
.scene-editor { container-type: inline-size; }
@container (min-width: 360px) { .scene-editor__form { grid-template-columns: 1fr 1fr; } }
```

### 11.4 View Transitions API (state animation)

```ts
async function openModal(): Promise<void> {
  if (typeof document.startViewTransition !== 'function') {
    setOpen(true);
    return;
  }
  document.startViewTransition(() => setOpen(true));
}
```

### 11.5 Subgrid

```css
.list { display: grid; grid-template-columns: auto 1fr auto; }
.list-item { display: grid; grid-column: 1 / -1; grid-template-columns: subgrid; }
```

### 11.6 `color-scheme` declaration

```css
:root { color-scheme: dark; }
```
ブラウザのスクロールバー、フォーム要素デフォルトを dark に揃える。

### 11.7 トークンの 3 階層構造

```css
/* primitive tokens */
:root {
  --color-neutral-50:  oklch(98% 0.003 100);
  --color-neutral-950: oklch(11% 0.005 240);
}
/* semantic tokens */
:root {
  --bg: var(--color-neutral-950);
  --text-primary: var(--color-neutral-50);
}
/* component tokens */
:root {
  --button-bg: var(--accent);
  --button-fg: var(--bg);
}
```

## 12. Do's and Don'ts

### Do
- LED ボードを視覚の中心に置く。クロームは subordinate
- すべての数値表示に `font-variant-numeric: tabular-nums`
- スクロール/ブリンクは LED ボード上だけで使い、クロームでは控える
- 不透明 / transform animation を優先 (layout を変えない)
- `prefers-reduced-motion` でクロームのアニメだけ止める
- セマンティック HTML (`<button>`, `<dialog>`, `<output>`)
- 全アイコンボタンに `aria-label`
- マウス操作には必ずキーボード相当を提供
- OKLCH カラースペースを使う
- Container queries で内部レスポンシブ

### Don't
- ボード上にグラデーションや絵文字を使わない (それはコンテンツの世界観を壊す)
- クロームに虹色を使わない (Linear-style 抑制)
- webfonts を読み込まない (system font + bitmap font のみ)
- CSS framework (Tailwind, Bootstrap) を入れない (tokens が真実)
- LED ボードの背景に純黒 #000 を使わない (off-dot が見えない)
- 純赤 #FF0000 を LED 赤に使わない (実物は ~607nm の橙寄り)
- pure white #FFFFFF を LED 白に使わない (cold すぎて駅の表示と乖離)
- alert() / confirm() / prompt() (ブロッキングダイアログ禁止)
- フルスクリーン中にカーソルを表示し続けない (3 秒で hide)
- 14px 未満のテキストをモバイルで使わない (iOS フォーカスズーム)

## 13. Agent Prompt Guide

新規 UI コードを生成するときは:
- `packages/web/src/styles/tokens.css` から CSS 変数を必ず読み、ハードコード禁止
- system font (`--font-ui` / `--font-mono`) を使う、webfont 不要
- 全インタラクティブ要素に `:focus-visible` 状態を提供
- 全アイコンボタンに `aria-label`
- アニメは `@media (prefers-reduced-motion: reduce)` で disable できる構造
- mobile-first: 最小ビューポートの基本スタイル → `@media (min-width: ...)` で積層
- 新色・新トークンを足す場合はまずこの DESIGN.md に提案 PR を出し、その後 `tokens.css` を更新
- LED 関連の色は `--led-*` トークンを使う、UI 関連は `--bg`/`--surface`/`--text-*`/`--accent`

### Quick token reference

- 主操作: `var(--accent)` / hover `var(--accent-hover)`
- 背景階層: `var(--bg)` → `var(--surface)` → `var(--surface-elevated)`
- テキスト: `var(--text-primary)` / `var(--text-secondary)` / `var(--text-muted)`
- LED: `var(--led-red)` / `var(--led-amber)` / `var(--led-green)` / `var(--led-blue)` / `var(--led-white)` / `var(--led-jr-orange)`
- 警告: `var(--danger)` / 成功: `var(--success)`

### Ready-to-use prompt

> "Build a Solid component called X for `led-board` (`packages/web/src/components/X.tsx`). Read design tokens from `packages/web/src/styles/tokens.css` and the conventions in `DESIGN.md`. Use system fonts via `--font-ui` / `--font-mono`, semantic HTML, ARIA labels, and respect `prefers-reduced-motion` for chrome animation. Mobile-first, touch targets ≥ 44×44, focus-visible outlines using `--focus-ring`, OKLCH color via `color-mix()` for derived shades."

## 14. References & Inspiration

### Real-world LED & Japanese signage
- JR West i-design LED 案内システム — https://www.i-design.jp/en/railways/jrw-led
- JR East ATOS 駅表示器 — https://www.therpf.com/forums/threads/jr-east-atos-system-display-emulator-departure-and-announcements-led-signage-bonus-coding-lessons.331095/
- JR West 駅サイン guide — https://www.westjr.co.jp/travel-information/en/train-usage-guide/howto/howtosign/

### Color & accessibility
- W3C WCAG 2.2 — https://www.w3.org/TR/WCAG22/
- WCAG 2.2 Focus Appearance — https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- OKLCH 解説 (Evil Martians) — https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl
- MDN `oklch()` — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch
- Radix Colors — https://www.radix-ui.com/colors
- Material Design 3 color roles — https://m3.material.io/styles/color/roles
- Tailwind v4 color system — https://tailwindcss.com/docs/colors
- Apple HIG dark mode — https://developer.apple.com/design/human-interface-guidelines/dark-mode

### Bitmap fonts
- 美咲フォント — https://littlelimit.net/misaki.htm
- k8x12 / k8x12L — https://littlelimit.net/k8x12.html
- Cica (modern bitmap-aesthetic) — https://github.com/miiton/Cica
- PlemolJP — https://github.com/yuru7/PlemolJP

### Design philosophy & UI patterns
- Linear redesign blog — https://linear.app/now/how-we-redesigned-the-linear-ui
- iA Writer typography — https://ia.net/topics/in-search-of-the-perfect-writing-font
- NN/G timing for hover-reveal — https://www.nngroup.com/articles/timing-exposing-content/
- VLC keyboard shortcuts (media convention) — https://wiki.videolan.org/QtHotkeys/

### Modern CSS
- MDN CSS Custom Properties — https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- MDN Container queries — https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries
- View Transitions API — https://developer.chrome.com/docs/web-platform/view-transitions
- MDN `prefers-reduced-motion` — https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

### Animation & motion
- Apple HIG motion — https://developer.apple.com/design/human-interface-guidelines/motion
- Material 3 motion — https://m3.material.io/styles/motion/overview

# Garden 開発計画

## 概要
PureRef ライクなイメージリファレンス・ムードボード作成ツール

## 技術スタック
- **フレームワーク**: Vue 3 + Composition API
- **ビルドツール**: Vite
- **言語**: TypeScript
- **キャンバス**: Canvas API / Konva.js
- **状態管理**: Pinia
- **スタイリング**: TailwindCSS
- **圧縮**: Compression Streams API（ブラウザネイティブ）
- **アーカイブ**: tar-stream-js または自前実装

## 開発方針
- **UI操作の実装**: すべてのUI操作ロジックはComposition APIで実装
- **テスト駆動開発**: 各機能実装時にVitestでテストを作成し、動作確認を行う
- **継続的検証**: 機能追加のたびにテストスイートを実行し、既存機能の動作を保証

## 開発フェーズ

### フェーズ1: 基盤構築
#### 1. Vue3 + Viteプロジェクトのセットアップ
- Vite + Vue3 + TypeScriptの初期設定
- TailwindCSSの導入
- Piniaの設定
- プロジェクト構造の整理

### フェーズ2: キャンバス機能
#### 2. 無限キャンバスの実装
- Canvas APIまたはKonva.jsの選定・実装
- ビューポート管理システム
- パン機能（マウスドラッグ/タッチ）
- ズーム機能（マウスホイール/ピンチジェスチャー）
- 座標変換システム（スクリーン座標↔キャンバス座標）

### フェーズ3: 画像管理
#### 3. 画像アップロード機能
- ドラッグ&ドロップゾーンの実装
- ファイル選択ダイアログ
- 画像フォーマット検証（JPEG, PNG, WebP, GIF）
- 画像のBase64エンコーディング

#### 4. クリップボードペースト機能
- Clipboard API実装
- Ctrl/Cmd+Vのショートカット
- 画像データの検証と変換

### フェーズ4: インタラクション
#### 5. 画像のドラッグ移動
- マウス/タッチイベントの処理
- ドラッグ中のビジュアルフィードバック
- スナップ機能（オプション）

#### 6. 画像のリサイズ機能
- リサイズハンドル（8方向）の実装
- アスペクト比保持（Shiftキー）
- 最小・最大サイズ制限

### フェーズ5: 選択システム
#### 7. クリック選択・削除機能
- シングルクリックで選択
- 選択状態の視覚的表示（枠線、ハンドル）
- Deleteキーでの削除
- Ctrl/Cmd+クリックで複数選択

#### 8. 矩形選択ツール
- ドラッグで選択範囲作成
- 選択範囲内の画像を一括選択
- Shiftで追加選択、Altで除外選択

### フェーズ6: データ永続化
#### 9. プロジェクト保存機能（tar.gz）
- プロジェクトデータ構造の設計
  ```json
  {
    "version": "1.0.0",
    "metadata": {
      "created": "2024-01-01T00:00:00Z",
      "modified": "2024-01-01T00:00:00Z"
    },
    "canvas": {
      "width": 10000,
      "height": 10000,
      "viewport": {
        "x": 0,
        "y": 0,
        "zoom": 1
      }
    },
    "images": [
      {
        "id": "uuid",
        "filename": "image1.jpg",
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 150,
        "rotation": 0,
        "zIndex": 1
      }
    ]
  }
  ```
- tarアーカイブの作成
  - project.json（メタデータ）
  - images/ディレクトリ（画像ファイル群）
- Compression Streams APIでのgzip圧縮
  ```typescript
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  ```
- ファイル保存ダイアログ（.garden拡張子）

#### 10. プロジェクト読み込み機能
- tar.gzファイルの選択・ドロップ
- Compression Streams APIでの解凍
  ```typescript
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  ```
- tarアーカイブの展開
- 画像とメタデータの復元
- エラーハンドリング（破損ファイル対策）

### フェーズ7: UI/UX
#### 11. ツールバー・メニュー
- ファイルメニュー（新規、開く、保存）
- 編集メニュー（元に戻す、やり直し、削除）
- ビューメニュー（ズーム、フィット）
- ツールバー（選択、パン、ズーム）

#### 12. ショートカットキー
- Ctrl/Cmd+S: 保存
- Ctrl/Cmd+O: 開く
- Ctrl/Cmd+Z: 元に戻す
- Ctrl/Cmd+Y: やり直し
- Space+ドラッグ: パン
- Delete: 削除
- Ctrl/Cmd+A: 全選択

### フェーズ8: 最適化
#### 13. パフォーマンス最適化
- 仮想化（ビューポート外の画像を非レンダリング）
- 画像の遅延読み込み
- サムネイル生成とキャッシュ
- WebWorkerでの重い処理の非同期化

#### 14. メモリ管理
- 不要な画像データの解放
- オフスクリーンキャンバスの活用
- 画像圧縮オプション

### フェーズ9: テスト・品質保証
#### 15. テスト実装
- Vitestでのユニットテスト
- Happy-DOMを使った無限キャンバスのテスト
  - パン操作のテスト
  - ズーム操作のテスト
  - 座標変換のテスト
  - ビューポート管理のテスト
- Playwrightでのe2eテスト
- コンポーネントテスト

#### 16. クロスブラウザ対応
- Chrome, Firefox, Safari, Edge対応
- モバイルブラウザ対応（タッチ操作）

## ディレクトリ構造
```
garden/
├── src/
│   ├── components/
│   │   ├── Canvas.vue
│   │   ├── Toolbar.vue
│   │   ├── ImageLayer.vue
│   │   └── SelectionBox.vue
│   ├── composables/
│   │   ├── useCanvas.ts        # パン・ズーム操作
│   │   ├── useImageManager.ts  # 画像の追加・削除・管理
│   │   ├── useSelection.ts     # 選択操作・矩形選択
│   │   ├── useDragResize.ts    # ドラッグ・リサイズ操作
│   │   └── useProjectIO.ts     # 保存・読み込み
│   ├── stores/
│   │   ├── canvas.ts
│   │   ├── images.ts
│   │   └── selection.ts
│   ├── utils/
│   │   ├── tarball.ts
│   │   ├── coordinates.ts
│   │   └── imageProcessor.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.vue
│   └── main.ts
├── public/
├── tests/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 主要な依存関係
```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0",
    "konva": "^9.3.0",
    "vue-konva": "^3.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "vitest": "^1.2.0",
    "happy-dom": "^12.10.0",
    "@vitest/ui": "^1.2.0",
    "@playwright/test": "^1.40.0"
  }
}
```

## マイルストーン
1. **M1**: 基本的なキャンバスと画像表示（2週間）
2. **M2**: インタラクション機能完成（2週間）
3. **M3**: 保存・読み込み機能実装（1週間）
4. **M4**: UI/UX改善とテスト（1週間）
5. **M5**: 最適化とリリース準備（1週間）

## 今後の拡張機能（将来的な検討）
- レイヤー機能
- テキスト注釈
- 描画ツール
- カラーピッカー
- グリッド・ガイド表示
- 画像フィルター・エフェクト
- クラウド同期
- コラボレーション機能
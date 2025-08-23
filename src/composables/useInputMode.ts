import { ref, computed, watch } from 'vue'

export type InputMode = 'mouse' | 'trackpad'

const STORAGE_KEY = 'garden-input-mode'

export function useInputMode() {
  // localStorageから初期値を取得
  const getInitialMode = (): InputMode => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'mouse' || stored === 'trackpad') {
      return stored
    }
    // デフォルトはトラックパッドモード（より汎用的）
    return 'trackpad'
  }

  const currentMode = ref<InputMode>(getInitialMode())

  // モード変更時にlocalStorageに保存
  watch(currentMode, (newMode) => {
    localStorage.setItem(STORAGE_KEY, newMode)
  })

  const isMouseMode = computed(() => currentMode.value === 'mouse')
  const isTrackpadMode = computed(() => currentMode.value === 'trackpad')

  const setMode = (mode: InputMode) => {
    currentMode.value = mode
  }

  const toggleMode = () => {
    currentMode.value = currentMode.value === 'mouse' ? 'trackpad' : 'mouse'
  }

  // モードごとの操作説明
  const getModeDescription = (mode: InputMode) => {
    if (mode === 'mouse') {
      return {
        pan: 'マウス中ボタンドラッグ or Alt+ドラッグ',
        zoom: 'マウスホイール',
        select: 'クリック',
        multiSelect: 'Ctrl/Cmd+クリック',
        description: 'マウス操作に最適化'
      }
    } else {
      return {
        pan: '2本指スワイプ or スペース+ドラッグ',
        zoom: '2本指ピンチ or Ctrl+スクロール',
        select: 'クリック',
        multiSelect: 'Ctrl/Cmd+クリック',
        description: 'トラックパッド・タッチ操作に最適化'
      }
    }
  }

  const currentModeDescription = computed(() => 
    getModeDescription(currentMode.value)
  )

  // モードごとの操作設定
  const getInputConfig = () => {
    if (currentMode.value === 'mouse') {
      return {
        // マウスモード: 中ボタンまたはAlt+左ボタンでパン
        enableMiddleButtonPan: true,
        enableAltPan: true,
        enableSpacePan: false,
        enableTwoFingerPan: false,
        // ホイールでズーム（Ctrlなし）
        enableWheelZoom: true,
        enableCtrlWheelZoom: false,
        // タッチジェスチャーは無効
        enableTouchGestures: false
      }
    } else {
      return {
        // トラックパッドモード: スペース+ドラッグでパン
        enableMiddleButtonPan: false,
        enableAltPan: false,
        enableSpacePan: true,
        enableTwoFingerPan: true,
        // Ctrl+ホイールでズーム（トラックパッドのピンチ）
        enableWheelZoom: false,
        enableCtrlWheelZoom: true,
        // タッチジェスチャーを有効
        enableTouchGestures: true
      }
    }
  }

  return {
    currentMode: computed(() => currentMode.value),
    isMouseMode,
    isTrackpadMode,
    setMode,
    toggleMode,
    currentModeDescription,
    getInputConfig
  }
}
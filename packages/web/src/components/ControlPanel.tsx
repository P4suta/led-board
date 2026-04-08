import type { Component } from 'solid-js';
import type { AppState } from '../state/store';
import { BoardConfigPanel } from './BoardConfigPanel';
import { SceneEditor } from './SceneEditor';

export interface ControlPanelProps {
  readonly state: AppState;
}

export const ControlPanel: Component<ControlPanelProps> = (props) => {
  return (
    <aside class="control-panel" aria-label="設定パネル">
      <SceneEditor
        scene={props.state.settings().scene}
        onChange={(patch) =>
          props.state.setSettings((prev) => ({
            ...prev,
            scene: { ...prev.scene, ...patch },
          }))
        }
      />
      <BoardConfigPanel
        config={props.state.settings().board}
        onChange={(patch) =>
          props.state.setSettings((prev) => ({
            ...prev,
            board: { ...prev.board, ...patch },
          }))
        }
      />
    </aside>
  );
};

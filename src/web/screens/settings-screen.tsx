import type { ChartType } from '../../state/types';
import { useSettings } from '../hooks/use-settings';
import { useConnection } from '../hooks/use-connection';
import { useDispatch } from '../hooks/use-store';
import { Page } from '../components/shared/page';
import { ScreenHeader } from '../components/shared/screen-header';
import { SettingsGroup } from '../components/shared/settings-group';
import { SegmentedControl } from '../components/ui/segmented-control';
import { StatusDot } from '../components/ui/status-dot';

function SettingsScreen() {
  const dispatch = useDispatch();
  const settings = useSettings();
  const connectionStatus = useConnection();

  return (
    <Page className="max-w-[500px]">
      <ScreenHeader title="Settings" />

      <SettingsGroup label="Refresh Interval">
        <SegmentedControl
          options={[5, 10, 15, 30, 60].map((v) => ({ value: String(v), label: `${v}s` }))}
          value={String(settings.refreshInterval)}
          onValueChange={(val) =>
            dispatch({ type: 'SETTING_CHANGE', key: 'refreshInterval', value: Number(val) })
          }
        />
      </SettingsGroup>

      <SettingsGroup label="Glass Chart Type">
        <SegmentedControl
          options={[
            { value: 'sparkline', label: 'Sparkline' },
            { value: 'candles', label: 'Candles' },
          ]}
          value={settings.chartType}
          onValueChange={(val) =>
            dispatch({ type: 'SETTING_CHANGE', key: 'chartType', value: val as ChartType })
          }
        />
      </SettingsGroup>

      <SettingsGroup label="Connection Status">
        <div className="flex items-center gap-2 text-sm">
          <StatusDot connected={connectionStatus === 'connected'} />
          <span className="text-text-dim">Glasses: {connectionStatus}</span>
        </div>
      </SettingsGroup>
    </Page>
  );
}

export { SettingsScreen };

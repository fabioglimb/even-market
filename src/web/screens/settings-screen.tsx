import type { ChartType } from '../../state/types';
import { useSettings } from '../hooks/use-settings';
import { useConnection } from '../hooks/use-connection';
import { useDispatch } from '../hooks/use-store';
import { Page } from '../components/shared/page';
import { ScreenHeader } from '../components/shared/screen-header';
import { SettingsGroup } from '../components/shared/settings-group';
import { GraphicPills } from '../components/shared/graphic-pills';
import { StatusDot } from '../components/ui/status-dot';
import { Select } from '../components/ui/select';

function SettingsScreen() {
  const dispatch = useDispatch();
  const settings = useSettings();
  const connectionStatus = useConnection();

  return (
    <Page className="max-w-[500px]">
      <ScreenHeader title="Settings" />

      <SettingsGroup label="Data Source">
        <div className="text-positive text-sm py-2">Yahoo Finance (no API key required)</div>
      </SettingsGroup>

      <SettingsGroup label="Refresh Interval">
        <Select
          options={[5, 10, 15, 30, 60].map((v) => ({ value: String(v), label: `${v}s` }))}
          value={String(settings.refreshInterval)}
          onValueChange={(val) =>
            dispatch({ type: 'SETTING_CHANGE', key: 'refreshInterval', value: Number(val) })
          }
        />
      </SettingsGroup>

      <SettingsGroup label="Glass Chart Type">
        <Select
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

      <SettingsGroup label="Graphics">
        <GraphicPills
          graphics={settings.graphics}
          onRemove={(graphicId) => dispatch({ type: 'GRAPHIC_REMOVE', graphicId })}
        />
      </SettingsGroup>

      <SettingsGroup label="Connection Status">
        <div className="flex items-center gap-2 text-sm">
          <StatusDot connected={connectionStatus === 'connected'} />
          <span>Glasses: {connectionStatus}</span>
        </div>
      </SettingsGroup>
    </Page>
  );
}

export { SettingsScreen };

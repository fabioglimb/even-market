import type { ChartType } from '../../state/types';
import { useSettings } from '../hooks/use-settings';
import { useConnection } from '../hooks/use-connection';
import { useDispatch } from '../hooks/use-store';
import { SettingsGroup, Select, SegmentedControl, StatusDot } from 'even-toolkit/web';
import { t, MARKET_LANGUAGES } from '../../utils/i18n';
import type { MarketLanguage } from '../../utils/i18n';

function SettingsScreen() {
  const dispatch = useDispatch();
  const settings = useSettings();
  const connectionStatus = useConnection();
  const lang = settings.language;

  return (
    <>
      <SettingsGroup label={t('web.refreshInterval', lang)}>
        <SegmentedControl
          options={[5, 10, 15, 30, 60].map((v) => ({ value: String(v), label: `${v}s` }))}
          value={String(settings.refreshInterval)}
          onValueChange={(val) =>
            dispatch({ type: 'SETTING_CHANGE', key: 'refreshInterval', value: Number(val) })
          }
        />
      </SettingsGroup>

      <SettingsGroup label={t('web.chartType', lang)}>
        <SegmentedControl
          options={[
            { value: 'sparkline', label: t('settings.sparkline', lang) },
            { value: 'candles', label: t('settings.candles', lang) },
          ]}
          value={settings.chartType}
          onValueChange={(val) =>
            dispatch({ type: 'SETTING_CHANGE', key: 'chartType', value: val as ChartType })
          }
        />
      </SettingsGroup>

      <SettingsGroup label={t('settings.language', lang)}>
        <Select
          options={MARKET_LANGUAGES.map((l) => ({ value: l.id, label: l.name }))}
          value={settings.language}
          onValueChange={(val) =>
            dispatch({ type: 'SETTING_CHANGE', key: 'language', value: val as MarketLanguage })
          }
        />
      </SettingsGroup>

      <SettingsGroup label={t('web.connectionStatus', lang)}>
        <div className="flex items-center gap-2 text-[13px] tracking-[-0.13px]">
          <StatusDot connected={connectionStatus === 'connected'} />
          <span className="text-text-dim">Glasses: {connectionStatus}</span>
        </div>
      </SettingsGroup>
    </>
  );
}

export { SettingsScreen };

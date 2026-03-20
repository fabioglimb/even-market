import type { ChartType } from '../../state/types';
import { useSettings } from '../hooks/use-settings';
import { useConnection } from '../hooks/use-connection';
import { useDispatch } from '../hooks/use-store';
import { Page, ScreenHeader, SettingsGroup, SegmentedControl, StatusDot } from 'even-toolkit/web';
import { t, MARKET_LANGUAGES } from '../../utils/i18n';
import type { MarketLanguage } from '../../utils/i18n';

function SettingsScreen() {
  const dispatch = useDispatch();
  const settings = useSettings();
  const connectionStatus = useConnection();
  const lang = settings.language;

  return (
    <Page className="max-w-[500px]">
      <ScreenHeader title={t('web.settings', lang)} subtitle="Configure your market data preferences and glasses connection" />

      <div className="space-y-4">
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
          <select
            className="w-full rounded-[6px] border border-border bg-surface-light px-3 py-2 text-[13px] tracking-[-0.13px] text-text"
            value={settings.language}
            onChange={(e) =>
              dispatch({ type: 'SETTING_CHANGE', key: 'language', value: e.target.value as MarketLanguage })
            }
          >
            {MARKET_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </SettingsGroup>

        <SettingsGroup label={t('web.connectionStatus', lang)}>
          <div className="flex items-center gap-2 text-[13px] tracking-[-0.13px]">
            <StatusDot connected={connectionStatus === 'connected'} />
            <span className="text-text-dim">Glasses: {connectionStatus}</span>
          </div>
        </SettingsGroup>
      </div>
    </Page>
  );
}

export { SettingsScreen };

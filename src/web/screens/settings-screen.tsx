import type { ReactNode } from 'react';
import type { ChartType } from '../../state/types';
import { useSettings } from '../hooks/use-settings';
import { useConnection } from '../hooks/use-connection';
import { useDispatch } from '../hooks/use-store';
import { Card, Select, SegmentedControl, Toggle, StatusDot } from 'even-toolkit/web';
import { t, MARKET_LANGUAGES } from '../../utils/i18n';
import type { MarketLanguage } from '../../utils/i18n';

function SettingRow({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <span className="text-[15px] tracking-[-0.15px] text-text font-normal">{label}</span>
        {description && <p className="text-[11px] tracking-[-0.11px] text-text-dim mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1.5 mt-2">
      <span className="text-[11px] tracking-[-0.11px] text-text-dim font-normal uppercase">{children}</span>
      <div className="flex-1 h-[1px] bg-border" />
    </div>
  );
}

function SettingsScreen() {
  const dispatch = useDispatch();
  const settings = useSettings();
  const connectionStatus = useConnection();
  const lang = settings.language;

  return (
    <>
      {/* Status */}
      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${connectionStatus === 'connected' ? 'bg-positive/10' : 'bg-negative/10'}`}>
            <StatusDot connected={connectionStatus === 'connected'} />
          </div>
          <div className="flex-1">
            <span className="text-[15px] tracking-[-0.15px] text-text font-normal">
              {connectionStatus === 'connected' ? 'Glasses Connected' : 'Glasses Disconnected'}
            </span>
            <p className="text-[11px] tracking-[-0.11px] text-text-dim mt-0.5">
              {connectionStatus === 'connected' ? 'G2 display is active' : 'Connect your G2 glasses to sync data'}
            </p>
          </div>
        </div>
      </Card>

      {/* Display */}
      <SectionLabel>Display</SectionLabel>
      <Card className="mb-4">
        <SettingRow label={t('web.refreshInterval', lang)} description="How often to refresh market data">
          <Select
            options={[5, 10, 15, 30, 60].map((v) => ({ value: String(v), label: `${v}s` }))}
            value={String(settings.refreshInterval)}
            onValueChange={(val) => dispatch({ type: 'SETTING_CHANGE', key: 'refreshInterval', value: Number(val) })}
            className="w-[80px]"
          />
        </SettingRow>
        <SettingRow label={t('web.chartType', lang)} description="Chart style on glasses display">
          <SegmentedControl
            size="small"
            options={[
              { value: 'sparkline', label: t('settings.sparkline', lang) },
              { value: 'candles', label: t('settings.candles', lang) },
            ]}
            value={settings.chartType}
            onValueChange={(val) => dispatch({ type: 'SETTING_CHANGE', key: 'chartType', value: val as ChartType })}
          />
        </SettingRow>
      </Card>

      {/* Language */}
      <SectionLabel>Language</SectionLabel>
      <Card className="mb-4">
        <SettingRow label={t('settings.language', lang)} description="App and glasses display language">
          <Select
            options={MARKET_LANGUAGES.map((l) => ({ value: l.id, label: l.name }))}
            value={settings.language}
            onValueChange={(val) => dispatch({ type: 'SETTING_CHANGE', key: 'language', value: val as MarketLanguage })}
            className="w-[130px]"
          />
        </SettingRow>
      </Card>

      {/* About */}
      <SectionLabel>About</SectionLabel>
      <Card>
        <SettingRow label="ER Market" description="Stock, crypto, forex & commodity tracker for G2 smart glasses">
          <span className="text-[11px] tracking-[-0.11px] text-text-dim">v0.1.3</span>
        </SettingRow>
      </Card>
    </>
  );
}

export { SettingsScreen };

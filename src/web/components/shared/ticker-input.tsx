import { useState } from 'react';
import type { ChartResolution } from '../../../state/types';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Button } from '../ui/button';

const RESOLUTIONS: ChartResolution[] = ['1', '5', '15', '60', 'D', 'W', 'M'];
const RES_OPTIONS = [
  { value: '1', label: '1 min' },
  { value: '5', label: '5 min' },
  { value: '15', label: '15 min' },
  { value: '60', label: '1 hour' },
  { value: 'D', label: 'Daily' },
  { value: 'W', label: 'Weekly' },
  { value: 'M', label: 'Monthly' },
];

interface TickerInputProps {
  onAdd: (symbol: string, resolution: ChartResolution) => void;
}

function TickerInput({ onAdd }: TickerInputProps) {
  const [symbol, setSymbol] = useState('');
  const [resolution, setResolution] = useState<ChartResolution>('D');

  function handleAdd() {
    const sym = symbol.trim().toUpperCase();
    if (sym) {
      onAdd(sym, resolution);
      setSymbol('');
    }
  }

  return (
    <div className="flex gap-2 ml-auto">
      <Input
        placeholder="Symbol (e.g. AMZN)"
        maxLength={10}
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <Select
        options={RES_OPTIONS}
        value={resolution}
        onValueChange={(v) => setResolution(v as ChartResolution)}
        className="bg-surface border border-border text-text rounded-md px-3 py-1.5 text-sm outline-none w-auto"
      />
      <Button onClick={handleAdd}>Add</Button>
    </div>
  );
}

export { TickerInput };

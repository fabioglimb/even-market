import { useState } from 'react';
import type { ChartResolution } from '../../../state/types';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Button } from '../ui/button';

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
    <div className="flex items-center gap-2 flex-wrap">
      <Input
        placeholder="Symbol (e.g. AMZN)"
        maxLength={10}
        value={symbol}
        className="w-40"
        onChange={(e) => setSymbol(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <div className="flex items-center">
        <Select
          options={RES_OPTIONS}
          value={resolution}
          onValueChange={(v) => setResolution(v as ChartResolution)}
          className="w-24 rounded-r-none border-r-0"
        />
        <Button onClick={handleAdd} className="rounded-l-none">
          Add
        </Button>
      </div>
    </div>
  );
}

export { TickerInput };

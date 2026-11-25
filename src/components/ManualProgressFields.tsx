import { cn } from '@/lib/cn';
import { useAppState } from '@/state/AppStateProvider';

interface ManualProgressFieldsProps {
  idPrefix?: string;
  disabled?: boolean;
  className?: string;
}

function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-body">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        inputMode="numeric"
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          onChange(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
        }}
        className="field tabular"
      />
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

export function ManualProgressFields({ idPrefix = 'manual', disabled = false, className }: ManualProgressFieldsProps) {
  const { extras, updateExtras, profile } = useAppState();
  const fromProfile = Boolean(profile?.missions?.length);

  if (fromProfile) {
    return (
      <div className={cn('space-y-4', className)}>
        <p className="text-sm text-muted">
          Junctions, intrinsics, and mission nodes are read from your profile. You can only add extra Star Chart
          points here.
        </p>
        <NumberField
          id={`${idPrefix}-starchart`}
          label="Extra Star Chart points"
          hint="Optional. Added on top of the mission data."
          value={extras.starChartPoints}
          disabled={disabled}
          onChange={(starChartPoints) => updateExtras({ starChartPoints })}
        />
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-3', className)}>
      <NumberField
        id={`${idPrefix}-junctions`}
        label="Junctions completed"
        hint="1,000 points each."
        value={extras.junctions}
        disabled={disabled}
        onChange={(junctions) => updateExtras({ junctions })}
      />
      <NumberField
        id={`${idPrefix}-intrinsics`}
        label="Intrinsic ranks"
        hint="1,500 points each."
        value={extras.intrinsics}
        disabled={disabled}
        onChange={(intrinsics) => updateExtras({ intrinsics })}
      />
      <NumberField
        id={`${idPrefix}-starchart`}
        label="Star Chart points"
        hint="Total, if you know it."
        value={extras.starChartPoints}
        disabled={disabled}
        onChange={(starChartPoints) => updateExtras({ starChartPoints })}
      />
    </div>
  );
}

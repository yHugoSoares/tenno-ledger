import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '@/lib/format';
import { manualPoints } from '@/lib/mastery';
import type { ThemePreference } from '@/lib/storage';
import { useAppState } from '@/state/AppStateProvider';
import { useToast } from '@/state/ToastProvider';
import { Button } from './Button';
import { ManualProgressFields } from './ManualProgressFields';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="settings-title"
      className="m-auto max-h-[90vh] w-[min(40rem,calc(100%-2rem))] rounded-lg border border-line/15 bg-surface-2 p-0 text-body shadow-lg backdrop:bg-black/60"
    >
      {open && <SettingsContent onClose={onClose} />}
    </dialog>
  );
}

function SettingsContent({ onClose }: { onClose: () => void }) {
  const { theme, setTheme, extras, clearAllData } = useAppState();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await clearAllData();
      toast('Local data deleted.', 'success');
      onClose();
    } catch {
      toast('Could not delete all local data. Clear this site’s data in your browser settings.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id="settings-title" className="text-lg font-semibold">
          Settings
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <section className="mt-6 space-y-2">
        <label htmlFor="settings-theme" className="block text-sm font-medium">
          Theme
        </label>
        <select
          id="settings-theme"
          value={theme}
          onChange={(event) => setTheme(event.target.value as ThemePreference)}
          className="field w-48"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">Match system</option>
        </select>
      </section>

      <section className="mt-8 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold">Extra progress</h3>
          <span className="text-sm tabular text-muted">{formatNumber(manualPoints(extras))} points</span>
        </div>
        <p className="text-sm text-muted">
          Stored only in this browser. Junctions and intrinsics come from the profile when it contains
          mission data.
        </p>
        <ManualProgressFields idPrefix="settings" />
      </section>

      <section className="mt-8 space-y-3">
        <h3 className="text-sm font-semibold">Local data</h3>
        <p className="text-sm text-muted">
          Removes the cached profile, manual values, overrides, theme choice, and the item cache from this
          browser. Your Warframe account is not affected.
        </p>
        {!confirming ? (
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
            Delete local data
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Delete everything stored in this browser?</span>
            <Button variant="danger" size="sm" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

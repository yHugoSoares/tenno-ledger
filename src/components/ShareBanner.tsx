import { Link } from 'react-router-dom';
import { formatDate } from '@/lib/format';
import { buttonClasses, Button } from './Button';

interface ShareBannerProps {
  createdAt: number;
  onCopy: () => void;
  onClear: () => void;
  hasLocalProfile: boolean;
}

export function ShareBanner({ createdAt, onCopy, onClear, hasLocalProfile }: ShareBannerProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line/15 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">Read-only shared profile</p>
        <p className="mt-0.5 text-sm text-muted">Created {formatDate(createdAt)}. The data is in the link itself.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onCopy}>
          Copy link
        </Button>
        {hasLocalProfile ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Back to my profile
          </Button>
        ) : (
          <Link to="/" className={buttonClasses('ghost', 'sm')}>
            Load my profile
          </Link>
        )}
      </div>
    </div>
  );
}

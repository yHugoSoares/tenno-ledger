import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCooldown } from '@/hooks/useCooldown';
import { PROFILE_ENDPOINT } from '@/lib/constants';
import { formatCooldown } from '@/lib/format';
import { formatMasteryRank } from '@/lib/mastery';
import { detectInputKind, isValidPlayerId, normalizePlayerId, playerIdHint } from '@/lib/id';
import {
  fetchProfile,
  parseProfileJson,
  ProfileParseError,
  toStoredProfile,
  type FetchFailureKind,
} from '@/lib/profile';
import { useAppState } from '@/state/AppStateProvider';
import { useToast } from '@/state/ToastProvider';
import { Button, buttonClasses } from './Button';
import { Card } from './Card';

interface InputError {
  title: string;
  message: string;
  details?: string;
}

interface ProfileInputProps {
  onTryDemo: () => void;
  demoDisabled?: boolean;
}

const FAILURE_TITLES: Record<FetchFailureKind | 'parse', string> = {
  throttled: 'Digital Extremes is limiting requests',
  'not-found': 'No account matches that gid',
  cors: 'This browser could not read the response',
  'invalid-id': 'That gid is not valid',
  upstream: 'The profile service returned an error',
  'invalid-response': 'The response was not profile data',
  parse: 'Could not read that profile',
};

export function ProfileInput({ onTryDemo, demoDisabled = false }: ProfileInputProps) {
  const { profile, setProfile } = useAppState();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<InputError | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cooldown = useCooldown(profile?.source === 'fetch' ? profile.fetchedAt : undefined);

  const kind = detectInputKind(value);
  const idValid = kind === 'id' && isValidPlayerId(value);
  const canFetch = idValid && !loading && cooldown <= 0;
  const canPaste = kind === 'json' && !loading;
  const hint = playerIdHint(value);
  const openUrl = `${PROFILE_ENDPOINT}?playerId=${encodeURIComponent(normalizePlayerId(value))}`;

  async function handleFetch() {
    if (!canFetch) return;
    setLoading(true);
    setError(null);
    const result = await fetchProfile(normalizePlayerId(value));
    setLoading(false);
    if (result.ok) {
      const stored = toStoredProfile(result.profile, 'fetch');
      setProfile(stored);
      toast(`Loaded ${stored.displayName}.`, 'success');
      navigate('/profile');
      return;
    }
    setError({
      title: FAILURE_TITLES[result.kind],
      message: result.message,
      details: result.status ? `HTTP ${result.status}` : undefined,
    });
  }

  function handlePaste() {
    if (!canPaste) return;
    setError(null);
    try {
      const parsed = parseProfileJson(value);
      const stored = toStoredProfile(parsed, 'paste');
      setProfile(stored);
      toast(`Loaded ${stored.displayName}.`, 'success');
      navigate('/profile');
    } catch (parseError) {
      if (parseError instanceof ProfileParseError) {
        const details = [
          parseError.topLevelKeys.length ? `Top-level keys: ${parseError.topLevelKeys.join(', ')}` : '',
          parseError.resultKeys.length ? `Results[0] keys: ${parseError.resultKeys.join(', ')}` : '',
          parseError.details ?? '',
        ]
          .filter(Boolean)
          .join('\n');
        setError({ title: FAILURE_TITLES.parse, message: parseError.message, details: details || undefined });
      } else {
        setError({
          title: FAILURE_TITLES.parse,
          message: 'The text could not be parsed. Copy the entire response and try again.',
        });
      }
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      if (kind === 'json') handlePaste();
      else if (idValid) window.open(openUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      {profile && (
        <p className="mb-5 border-b border-line/10 pb-5 text-sm text-muted">
          Last loaded: <span className="text-body">{profile.displayName}</span>
          {profile.playerLevel > 0 ? `, in-game ${formatMasteryRank(profile.playerLevel)}` : ''}.{' '}
          <Link to="/profile" className="text-accent underline underline-offset-4">
            Open profile
          </Link>
        </p>
      )}

      <label htmlFor="profile-input" className="block text-sm font-medium">
        Your gid or the profile text
      </label>
      <textarea
        ref={textareaRef}
        id="profile-input"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError(null);
        }}
        onKeyDown={handleKeyDown}
        rows={4}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="Example gid: 59f5ddd43ade7ffabc5a1f53"
        aria-describedby="profile-input-help"
        className="field mt-2 h-auto resize-y py-2 font-mono text-xs leading-5 sm:text-sm"
      />
      <p id="profile-input-help" className="mt-2 min-h-5 text-xs text-muted">
        {kind === 'id' && !hint && 'Valid gid. Open the profile response to continue.'}
        {kind === 'json' && 'Profile text detected. It is read in this browser only.'}
        {hint}
        {kind === 'empty' && 'Paste a gid, or paste the full text of the profile response.'}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {kind === 'json' ? (
          <Button onClick={handlePaste} disabled={!canPaste}>
            Load pasted text
          </Button>
        ) : idValid ? (
          <a href={openUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary', 'md')}>
            Open profile response
          </a>
        ) : (
          <Button disabled>Load pasted text</Button>
        )}

        {idValid && kind === 'id' && (
          <Button variant="secondary" onClick={() => void handleFetch()} disabled={!canFetch}>
            {loading
              ? 'Fetching…'
              : cooldown > 0
                ? `Fetch locked for ${formatCooldown(cooldown)}`
                : 'Try fetching here'}
          </Button>
        )}

        <Button variant="ghost" onClick={onTryDemo} disabled={demoDisabled || loading}>
          Use demo data
        </Button>
      </div>

      <p className="mt-4 text-xs leading-5 text-muted">
        “Try fetching here” only works when the browser allows it. Opening the response and pasting always works.
        A successful fetch is cached for 12 hours.
      </p>

      {error && (
        <div role="alert" className="mt-5 rounded-md border border-rose-500/40 p-4 text-sm">
          <p className="font-medium">{error.title}</p>
          <p className="mt-1 text-muted">{error.message}</p>
          {error.details && (
            <details className="mt-2 text-xs text-muted">
              <summary className="cursor-pointer text-body">Technical details</summary>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono">{error.details}</pre>
            </details>
          )}
        </div>
      )}
    </Card>
  );
}

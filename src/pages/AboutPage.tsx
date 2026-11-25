import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { APP_NAME, DISCLAIMER, GITHUB_URL } from '@/lib/constants';

const githubUrl = import.meta.env.VITE_GITHUB_URL || GITHUB_URL;

export function AboutPage() {
  useDocumentTitle('About and privacy');

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">About {APP_NAME}</h1>
      <div className="prose-plain mt-6">
        <p>
          {APP_NAME} is a free, open-source mastery tracker for Warframe. It reads a public profile, compares it with
          the community item list, and shows what is mastered, what is missing, and what is worth finishing next.
        </p>
        <p>{DISCLAIMER}</p>

        <h2 id="privacy" className="scroll-mt-20">
          Privacy statement
        </h2>
        <ul>
          <li>
            <strong>No accounts, analytics, or advertising.</strong> The site is static files. The server does not
            receive profile data, gids, or any settings.
          </li>
          <li>
            <strong>Profile data stays in your browser.</strong> Pasted text is parsed locally. A successful browser
            fetch is cached in local storage for 12 hours.
          </li>
          <li>
            <strong>Local storage holds:</strong> the trimmed profile (name, rank, XP per item, mission tags, intrinsic
            ranks), manual values, item overrides, and your theme choice. Delete everything in Settings.
          </li>
          <li>
            <strong>Share links</strong> contain a compressed copy of the snapshot you choose to share, in the URL
            fragment. The fragment is not sent to the server. Anyone with the link can read it.
          </li>
          <li>
            <strong>Hosting logs.</strong> The web host may keep short-lived request logs (IP address, user agent,
            path) for security. They are not linked to profile data.
          </li>
        </ul>

        <h2 id="how-it-works" className="scroll-mt-20">
          How the numbers are calculated
        </h2>
        <ul>
          <li>
            <strong>Mastery rank</strong> N needs 2,500 × N² points. MR 7 needs 122,500.
          </li>
          <li>
            <strong>Item points</strong> come from affinity (the XP shown in the profile). Weapons award 3,000 points
            at rank 30 (450,000 affinity). Warframes, companions, Archwings, and K-Drives award 6,000 at rank 30
            (900,000 affinity).
          </li>
          <li>
            <strong>Affinity thresholds</strong> follow the wiki’s cumulative table: 500 × rank² for weapons and 1,000 ×
            rank² for frames, companions, and Archwings. Kuva, Tenet, Coda, and Paracesis weapons, and Necramechs, use
            their published Forma tables for ranks 31 to 40.
          </li>
          <li>
            <strong>Necramechs</strong> award 8,000 points in total. Points are granted per rank from 30 to 40.
          </li>
          <li>
            <strong>Star Chart nodes</strong> are read from the profile’s <code>Missions</code> list. Only the first
            completion of a node counts. The mastery map contains per-node values for 169 nodes, totalling 14,569 points.
          </li>
          <li>
            <strong>Junctions</strong> are worth 1,000 points each, with a total of 13,000.
          </li>
          <li>
            <strong>Intrinsics</strong> come from the <code>LPS_*</code> fields in <code>PlayerSkills</code>, at 1,500
            points per rank. Focus pools such as <code>LPP_DRIFTER</code> are not intrinsic ranks.
          </li>
          <li>
            <strong>Unknown nodes</strong> that the mastery map does not list yet are shown on the profile page and are
            not counted.
          </li>
        </ul>

        <h2 id="data-sources" className="scroll-mt-20">
          Data sources
        </h2>
        <ul>
          <li>
            <strong>Item list:</strong> the WFCD <code>warframe-items</code> project. Only items with{' '}
            <code>masterable: true</code> are included.
          </li>
          <li>
            <strong>Star Chart map:</strong> per-node mastery values from the community FrameHub project, refreshed with{' '}
            <code>npm run sync:mission-data</code>.
          </li>
          <li>
            <strong>Profile:</strong> the public profile response from Digital Extremes, read only when you ask for it.
          </li>
        </ul>

        <h2>Contributing</h2>
        <p>
          Data corrections, bug reports, and accessibility fixes are welcome on{' '}
          <a href={githubUrl} target="_blank" rel="noreferrer noopener">
            GitHub
          </a>
          . Do not include profile text, gids, or cookies in a public issue.
        </p>
        <p>
          <Link to="/">Back to the home page</Link>
        </p>
      </div>
    </div>
  );
}

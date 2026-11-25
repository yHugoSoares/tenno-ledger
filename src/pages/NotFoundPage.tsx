import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { buttonClasses } from '@/components/Button';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-muted">The address may be mistyped, or the page may have moved.</p>
      <Link to="/" className={buttonClasses('primary', 'md', 'mt-6')}>
        Back to the home page
      </Link>
    </div>
  );
}

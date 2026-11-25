export function CookieGuide() {
  return (
    <details className="rounded-md border border-line/10 bg-surface px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium">Where is the gid cookie?</summary>
      <div className="mt-4 grid gap-6 text-muted sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-body">Firefox</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Sign in at warframe.com.</li>
            <li>Open developer tools (F12).</li>
            <li>Choose the Storage tab, then Cookies, then https://www.warframe.com.</li>
            <li>Copy the value of gid.</li>
          </ol>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-body">Chrome and Edge</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Sign in at warframe.com.</li>
            <li>Open developer tools (F12).</li>
            <li>Choose Application, then Cookies, then https://www.warframe.com.</li>
            <li>Copy the value of gid.</li>
          </ol>
        </div>
      </div>
      <p className="mt-4 text-muted">
        Copy only gid. Never copy session, remember-me, or XSRF cookies.
      </p>
    </details>
  );
}

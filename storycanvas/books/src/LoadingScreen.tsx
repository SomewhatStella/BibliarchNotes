/** Shared "opening" screen: an open book whose page turns, in the site's own colours (light and dark). */
export default function LoadingScreen({message, detail}: {message: string; detail?: string}) {
  return <div className="loading-screen" role="status" aria-live="polite">
    <div className="loading-book" aria-hidden="true">
      <span className="lb-page lb-left"><i/><i/><i/><i/></span>
      <span className="lb-page lb-right"><i/><i/><i/><i/></span>
      <span className="lb-page lb-turn"><i/><i/><i/><i/></span>
    </div>
    <p className="loading-message">{message}</p>
    {detail && <p className="loading-detail">{detail}</p>}
  </div>;
}

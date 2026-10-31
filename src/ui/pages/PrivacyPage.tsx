import css from './Prose.module.css'

export function PrivacyPage() {
  return (
    <article className={`narrow ${css.prose}`}>
      <h1>Privacy</h1>
      <p className={css.lede}>Political opinions are sensitive. 12 Axes² is built so that nobody — including us — receives yours.</p>
      <h2>What happens to your answers</h2>
      <ul>
        <li>All scoring runs in your browser. The site is static files; there is no server code and no database.</li>
        <li>There are no analytics, trackers, cookies, ads or third-party scripts. Fonts are served with the site.</li>
        <li>
          The page’s security policy forbids it from making network requests at all (<code>connect-src 'none'</code>). You can
          check this in your browser’s developer tools.
        </li>
        <li>
          If “Save my progress” is on, your answers are kept in this browser’s local storage so you can resume, and each finished
          run is kept in <a href="#/history">your runs</a> (up to 200, all answers included) so you can see how your views change
          and re-score old runs when the method improves. “Clear my data” (footer and results page) deletes all of it. Turn saving
          off before you start if you share this device.
        </li>
      </ul>
      <h2>What a share link contains</h2>
      <ul>
        <li>Your axis scores, error bars, gaps and Reality Gap — never your individual answers.</li>
        <li>System confidence, country and your country placements only if you tick them on the share sheet.</li>
        <li>
          The scores sit after the <code>#</code> in the link. Browsers don’t send that part to the web host, but anyone you give
          the link to — and any site you post it on — can read it.
        </li>
        <li>
          A “link with preview” adds your headline ideology to the visible part of the address so social sites can show a preview.
          The web host can see that part. Use “link without preview” to avoid it.
        </li>
      </ul>
      <h2>Exporting</h2>
      <p>The full diagnostic report includes your answers and only goes where you paste it.</p>
      <p>
        “Export my runs” downloads a JSON file of every saved run, with all answers, to your device. It is never uploaded. You
        can import it in another browser to move your history there. If you choose to share it — for example to help validate the
        test — that’s up to you.
      </p>
    </article>
  )
}

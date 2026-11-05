import './globals.css';
import './theme.css';
import './site.css';
import './loading.css';
import './feedback.css';
import {ThemeBootstrap} from '../src/ThemeToggle';
import SiteNavigation from '../src/SiteNavigation';
import AskHost from '../src/AskDialog';
export const metadata={title:{default:'Bibliarch — Notes & Books',template:'%s — Bibliarch'},description:'Plan characters, connect ideas, and design your books. Two creative workspaces, one home.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><ThemeBootstrap /></head><body suppressHydrationWarning><div className="site-shell"><SiteNavigation/><div className="site-workspace">{children}</div></div><AskHost/></body></html>}

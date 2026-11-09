import './globals.css';
import './theme.css';
import './site.css';
import './loading.css';
import './feedback.css';
import {ThemeBootstrap} from '../src/ThemeToggle';
import SiteNavigation from '../src/SiteNavigation';
import AskHost from '../src/AskDialog';
export const metadata:import('next').Metadata={metadataBase:new URL('https://bibliarch.com'),applicationName:'Bibliarch',title:{default:'Bibliarch: Visual Notes, Book Creator and OC Tools for Writers',template:'%s — Bibliarch'},description:'Free online tools for writers: plan stories and original characters on a visual note-taking board, then write, design and export your book as a PDF or EPUB.',openGraph:{type:'website',siteName:'Bibliarch',locale:'en_US',url:'/',images:[{url:'/og.png',width:1200,height:630,alt:'Bibliarch: plan your story, then make the book'}]},twitter:{card:'summary_large_image',images:['/og.png']}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><ThemeBootstrap /></head><body suppressHydrationWarning><div className="site-shell"><SiteNavigation/><div className="site-workspace">{children}</div></div><AskHost/></body></html>}

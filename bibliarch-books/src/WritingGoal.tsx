'use client';
import {useEffect, useRef, useState} from 'react';
import {GOAL_CHOICES} from './goals';

function Ring({value, size = 18}: {value: number; size?: number}) {
  const r = size / 2 - 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="goal-ring">
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="3"/>
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={v >= 1 ? '#2f8f5a' : 'var(--ui-accent,#2e5aac)'} strokeWidth="3" strokeLinecap="round"
      strokeDasharray={`${c * v} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}/>
  </svg>;
}

/** Status-bar chip: today's words against the daily goal, the streak, and a menu to change the goal. */
export function GoalChip({goal, words, streak, setGoal}: {goal: number; words: number; streak: number; setGoal: (n: number) => void}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return <div className="goal-chip" ref={ref}>
    <button aria-haspopup="dialog" aria-expanded={open} title="Daily writing goal" onClick={() => setOpen(o => !o)}>
      {goal > 0 ? <><Ring value={words / goal}/><span>Today <b>{words.toLocaleString()}</b> / {goal.toLocaleString()} words</span></> : <span>Today {words.toLocaleString()} words</span>}
      {streak > 0 && <span className="goal-streak" title={`${streak} ${streak === 1 ? 'day' : 'days'} in a row`}><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z"/></svg>{streak} {streak === 1 ? 'day' : 'days'}</span>}
    </button>
    {open && <div className="goal-pop" role="dialog" aria-label="Daily writing goal">
      <strong>Daily writing goal</strong>
      <div className="goal-options">{GOAL_CHOICES.map(n => <button key={n} aria-pressed={goal === n} onClick={() => { setGoal(n); setOpen(false); }}>{n ? n.toLocaleString() : 'Off'}</button>)}</div>
      <p>Write this many new words a day, in any of your books. Hit it day after day to grow your streak.</p>
    </div>}
  </div>;
}

export function GoalToast({words, onClose}: {words: number; onClose: () => void}) {
  return <div className="goal-toast" role="status"><span className="goal-toast-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg></span><div><strong>Daily goal reached!</strong><small>{words.toLocaleString()} words today. Keep going or call it a day.</small></div><button aria-label="Dismiss" onClick={onClose}>×</button></div>;
}

/** The only chrome left in focus mode. */
export function FocusBar({goal, words, dark, onDark, onExit}: {goal: number; words: number; dark: boolean; onDark: () => void; onExit: () => void}) {
  // Out of the way while you write: appears when the mouse moves, fades while typing.
  const [shown, setShown] = useState(true);
  useEffect(() => {
    let t = window.setTimeout(() => setShown(false), 2500);
    const move = () => { setShown(true); clearTimeout(t); t = window.setTimeout(() => setShown(false), 2500); };
    const type = () => { clearTimeout(t); setShown(false); };
    window.addEventListener('mousemove', move); window.addEventListener('keydown', type);
    return () => { clearTimeout(t); window.removeEventListener('mousemove', move); window.removeEventListener('keydown', type); };
  }, []);
  return <div className={`focus-bar${shown ? ' shown' : ''}`} role="toolbar" aria-label="Focus mode">
    {goal > 0 ? <span className="focus-progress"><Ring value={words / goal} size={16}/>{words.toLocaleString()} / {goal.toLocaleString()} today</span> : <span className="focus-progress">{words.toLocaleString()} words today</span>}
    <button onClick={onDark} aria-pressed={dark} title="Darker surroundings for writing at night">{dark ? 'Light' : 'Dim'} room</button>
    <button className="focus-exit" onClick={onExit} title="Leave focus mode (Esc)">Exit focus</button>
  </div>;
}

'use client';
import {useEffect, useRef, useState} from 'react';

/*
 * Daily word goal and streak, kept on this device. "Words today" is the growth of
 * the whole library since the first time it was opened today (net words, like most
 * writing apps), so switching books doesn't reset it.
 */
type Day = {start: number; words: number; goal: number};
export type GoalState = {goal: number; days: Record<string, Day>};
export const GOAL_CHOICES = [0, 250, 500, 1000, 2000];
const key = (userId: string) => `bibliarch-books-goals:${userId}`;
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayBefore = (iso: string) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - 1); return today(d); };

export function load(userId: string): GoalState {
  try { const v = JSON.parse(localStorage.getItem(key(userId)) || 'null'); if (v && typeof v.goal === 'number' && v.days) return v; } catch { /* fresh start */ }
  return {goal: 500, days: {}};
}
/** Record the library's word total for today; returns the updated state. */
export function record(state: GoalState, total: number, date = today()): GoalState {
  const day = state.days[date];
  const next: Day = day ? {...day, words: Math.max(0, total - day.start), goal: state.goal} : {start: total, words: 0, goal: state.goal};
  const days = {...state.days, [date]: next};
  // Keep about a year of history.
  const keys = Object.keys(days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 400))) delete days[k];
  return {...state, days};
}
/** Days in a row the goal was met, counting today only once it's reached. */
export function streak(state: GoalState, date = today()): number {
  let n = 0, d = date;
  const met = (k: string) => { const x = state.days[k]; return !!x && x.goal > 0 && x.words >= x.goal; };
  if (!met(d)) d = dayBefore(d);
  while (met(d)) { n++; d = dayBefore(d); }
  return n;
}

export function useWritingGoal(userId: string, total: number, ready: boolean) {
  const [state, setState] = useState<GoalState>(() => typeof window === 'undefined' ? {goal: 500, days: {}} : load(userId));
  const [celebrate, setCelebrate] = useState(false);
  const shown = useRef('');
  useEffect(() => {
    if (!ready) return;
    setState(s => {
      const next = record(s, total);
      const d = today(), day = next.days[d];
      if (s.goal > 0 && day.words >= s.goal && (s.days[d]?.words ?? 0) < s.goal && shown.current !== d) { shown.current = d; setCelebrate(true); }
      try { localStorage.setItem(key(userId), JSON.stringify(next)); } catch { /* storage full: goal tracking is optional */ }
      return next;
    });
  }, [total, ready, userId]);
  useEffect(() => { if (!celebrate) return; const t = setTimeout(() => setCelebrate(false), 4000); return () => clearTimeout(t); }, [celebrate]);
  /** Words that appear without being written (a new template, an imported manuscript) don't count toward today. */
  const exclude = (n: number) => { if (n) setState(s => { const d = today(), day = s.days[d]; if (!day) return s; const next = {...s, days: {...s.days, [d]: {...day, start: day.start + n}}}; try { localStorage.setItem(key(userId), JSON.stringify(next)); } catch { /* optional */ } return next; }); };
  const setGoal = (goal: number) => setState(s => { const next = {...s, goal, days: {...s.days}}; const d = today(); if (next.days[d]) next.days[d] = {...next.days[d], goal}; try { localStorage.setItem(key(userId), JSON.stringify(next)); } catch { /* optional */ } return next; });
  const words = state.days[today()]?.words ?? 0;
  return {goal: state.goal, words, streak: streak(state), setGoal, exclude, celebrate, dismiss: () => setCelebrate(false)};
}

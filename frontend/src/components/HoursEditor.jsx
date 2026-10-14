import React from 'react';
import { DAYS, DAY_ORDER } from '../utils/format.js';

/** Weekly opening hours editor. value = [{day,isClosed,open,close}] x 7 */
export default function HoursEditor({ value, onChange, error }) {
  const set = (day, patch) => onChange(value.map((h) => (h.day === day ? { ...h, ...patch } : h)));
  const copyMonday = () => {
    const mon = value.find((h) => h.day === 1);
    onChange(value.map((h) => (h.day === 1 ? h : { ...h, isClosed: mon.isClosed, open: mon.open, close: mon.close })));
  };
  return (
    <div className="hours-editor">
      {DAY_ORDER.map((d) => {
        const h = value.find((x) => x.day === d);
        return (
          <div className="hrow" key={d}>
            <span className="hday">{DAYS[d].slice(0, 3)}</span>
            <label className="check">
              <input type="checkbox" checked={!h.isClosed} onChange={(e) => set(d, { isClosed: !e.target.checked })} /> {h.isClosed ? 'Closed' : 'Open'}
            </label>
            <input type="time" aria-label={`${DAYS[d]} opens`} value={h.open} disabled={h.isClosed} onChange={(e) => set(d, { open: e.target.value })} />
            <span aria-hidden="true">–</span>
            <input type="time" aria-label={`${DAYS[d]} closes`} value={h.close} disabled={h.isClosed} onChange={(e) => set(d, { close: e.target.value })} />
          </div>
        );
      })}
      <button type="button" className="mutedbtn small" onClick={copyMonday}>Copy Monday to all days</button>
      <div className="sub">Closing earlier than opening (for example 17:00 – 01:00) means the place stays open past midnight. Same time for both means open 24 hours.</div>
      {error && <div className="fielderr" role="alert">{error}</div>}
    </div>
  );
}

import React from 'react';

export function Pager({ data, onPage }) {
  if (!data || data.pages <= 1) return <p className="sub">{data?.total ?? 0} total</p>;
  return (
    <div className="pager">
      <button className="mutedbtn" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>← Previous</button>
      <span className="sub">Page {data.page} of {data.pages} · {data.total} total</span>
      <button className="mutedbtn" disabled={data.page >= data.pages} onClick={() => onPage(data.page + 1)}>Next →</button>
    </div>
  );
}

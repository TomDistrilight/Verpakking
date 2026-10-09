import type { ReactNode } from 'react';

export function Getal(props: {
  label: string;
  waarde: string;
  onChange: (v: string) => void;
  eenheid?: string;
  hint?: string;
  uit?: boolean;
  id?: string;
}) {
  return (
    <label className={`veld${props.uit ? ' uit' : ''}`}>
      <span className="veld-label">{props.label}</span>
      <span className="invoer-met-eenheid">
        <input
          id={props.id}
          inputMode="decimal"
          value={props.waarde}
          disabled={props.uit}
          onChange={(e) => props.onChange(e.target.value)}
          aria-label={props.label}
        />
        {props.eenheid && <span className="eenheid">{props.eenheid}</span>}
      </span>
      {props.hint && <span className="hint">{props.hint}</span>}
    </label>
  );
}

export function Tekst(props: { label: string; waarde: string; onChange: (v: string) => void; lijst?: string; placeholder?: string }) {
  return (
    <label className="veld">
      <span className="veld-label">{props.label}</span>
      <input value={props.waarde} list={props.lijst} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} aria-label={props.label} />
    </label>
  );
}

export function Vink(props: { label: string; aan: boolean; onChange: (v: boolean) => void; uit?: boolean }) {
  return (
    <label className={`vink${props.uit ? ' uit' : ''}`}>
      <input type="checkbox" checked={props.aan} disabled={props.uit} onChange={(e) => props.onChange(e.target.checked)} />
      <span>{props.label}</span>
    </label>
  );
}

export function Keuze<T extends string>(props: { label: string; waarde: T; opties: { waarde: T; tekst: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="veld">
      <span className="veld-label">{props.label}</span>
      <select value={props.waarde} onChange={(e) => props.onChange(e.target.value as T)} aria-label={props.label}>
        {props.opties.map((o) => (
          <option key={o.waarde} value={o.waarde}>
            {o.tekst}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Sectie(props: { titel: string; children: ReactNode; rechts?: ReactNode }) {
  return (
    <section className="sectie">
      <div className="sectie-kop">
        <h3>{props.titel}</h3>
        {props.rechts}
      </div>
      {props.children}
    </section>
  );
}

export function Rij(props: { children: ReactNode }) {
  return <div className="rij">{props.children}</div>;
}

export function Svg(props: { svg: string; className?: string; titel?: string }) {
  return <div className={`svg ${props.className ?? ''}`} title={props.titel} dangerouslySetInnerHTML={{ __html: props.svg }} />;
}

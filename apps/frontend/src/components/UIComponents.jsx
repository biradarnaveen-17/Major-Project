import React from "react";

export function Field({ label, ...props }) {
  return <label className="field">{label}<input {...props} /></label>;
}

export function SelectField({ label, children, ...props }) {
  return <label className="field">{label}<select {...props}>{children}</select></label>;
}

export function Card({ title, children, action }) {
  return <section className="panel"><div className="panel-title"><h2>{title}</h2>{action}</div>{children}</section>;
}

export function Metric({ label, value, caption, tone = "blue" }) {
  return <article className={`metric-card ${tone}`}><p>{label}</p><strong>{value}</strong><small>{caption}</small></article>;
}

export function Pill({ children, tone = "neutral", style }) {
  return <span className={`pill ${tone}`} style={style}>{children}</span>;
}

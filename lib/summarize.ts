import { basename, humanBytes, truncate } from "./format";
import type { SourceType } from "./types";

type Raw = Record<string, unknown>;

const s = (v: unknown) => (v === undefined || v === null ? "" : String(v));

function urlPath(url: unknown): string {
  try {
    const u = new URL(s(url));
    return u.pathname + u.search;
  } catch {
    return "";
  }
}

/** Deterministic one-line summary per source and event ID (spec 7.1). */
export function summarize(source: SourceType, eventId: number | string, raw: Raw): string {
  const id = String(eventId);
  if (source === "sysmon") {
    switch (id) {
      case "1":
        return `${basename(raw.Image)} started by ${basename(raw.ParentImage)} — ${truncate(s(raw.CommandLine), 90)}`;
      case "3":
        return `${basename(raw.Image)} → ${s(raw.DestinationIp)}:${s(raw.DestinationPort)}${raw.DestinationHostname ? ` (${s(raw.DestinationHostname)})` : ""}`;
      case "10":
        return `${basename(raw.SourceImage)} opened ${basename(raw.TargetImage)} (access ${s(raw.GrantedAccess)})`;
      case "11":
        return `${basename(raw.Image)} created ${s(raw.TargetFilename)}`;
      case "22":
        return `${basename(raw.Image)} resolved ${s(raw.QueryName)} → ${s(raw.QueryResults).replace(/;$/, "")}`;
    }
  }
  if (source === "winsec") {
    const from = raw.IpAddress && raw.IpAddress !== "-" ? ` from ${s(raw.IpAddress)}` : "";
    switch (id) {
      case "4624":
        return `Logon success · ${s(raw.TargetDomainName)}\\${s(raw.TargetUserName)} · type ${s(raw.LogonType)}${from}`;
      case "4625":
        return `Logon failure · ${s(raw.TargetDomainName)}\\${s(raw.TargetUserName)} · type ${s(raw.LogonType)}${from} · ${s(raw.SubStatus)}`;
      case "4648":
        return `Explicit credentials · ${s(raw.SubjectUserName)} as ${s(raw.TargetUserName)} → ${s(raw.TargetServerName)} via ${basename(raw.ProcessName)}`;
    }
  }
  if (source === "proxy") {
    return `${s(raw.method)} ${s(raw.dest_host)}${urlPath(raw.url)} · out ${humanBytes(raw.bytes_out)} · in ${humanBytes(raw.bytes_in)}`;
  }
  if (source === "defender") {
    if (id === "1116") return `Detected ${s(raw.ThreatName)} at ${s(raw.Path).replace(/^file:_/, "")}`;
    if (id === "1117") return `Action: ${s(raw.ActionName)} · ${s(raw.ThreatName)}`;
  }
  return s(raw.EventName) || `${source} event ${id}`;
}

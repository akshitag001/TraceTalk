# Decisions

Places where the spec was open, and the simplest choice that met it.

- **Time windows.** Candidate retrieval uses ±90 s around a spoken time, as specified. For an offline `supports` link the window is tighter: the whole spoken minute for "14:32", or ±10 s for "14:32:07". This falls back to ±90 s when nothing matches. Without this, "at 14:32" would also confirm PowerShell's 14:31:51 connection to the stager host.
- **Clause splitting.** The offline parser splits a sentence at a comma, semicolon or ", so" when one side hedges ("probably", "looks like") and the other doesn't. That gives "Explorer started PowerShell" (fact) + "the user probably ran it" (hypothesis).
- **"The process".** In a launch claim, "the process" / "it" refers to the process from the previous statement's supporting event. In the demo, that resolves to rundll32 from EVT-0017.
- **Extra keyword aliases.** Besides the listed aliases: `credentials`/`dump` matches lsass access (sysmon 10), and `exfiltration`/`upload`/`went out`/`megabytes` matches proxy events with `bytes_out` over 10 MB. Spoken sizes ("46 megabytes") match `bytes_out`/`bytes_in` within 10%, in decimal or binary units.
- **Related links outside the time window.** These are only made for specific entities (IPs, domains, file names like `cache.rar`, users, hosts, sizes), capped at 3 per entry. Generic process names would otherwise link half the case.
- **Hypotheses share context.** A hypothesis split from a fact in the same sentence gets that fact's events as `related`.
- **Answering unknowns offline.** A confirmed fact answers an open unknown when one of its supporting events is one the unknown listed as related.
- **Recheck merges.** A recheck can add links or change a relation, but it never silently removes an existing link. Unlinking is an explicit analyst action.
- **Report summary.** This goes through the same `/api/parse` route (`mode: "summary"`), to keep the single server route the spec allows.
- **Display time zone.** Timeline and ledger times are shown in the case's spoken-time zone, so what you see matches what you say. Full ISO UTC is in every tooltip.
- **New cases.** "Start a new case" creates an ID like `CASE-20261027-AB12` and stores it in its own localStorage key.

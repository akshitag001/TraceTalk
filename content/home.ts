/**
 * Homepage copy. Edit freely; components only read from here.
 * Fields marked TODO are yours to fill in before submitting.
 */

export const site = {
  name: "TraceTalk",
  sampleCaseHref: "/case/IR-2026-0147",
  importHref: "/case/IR-2026-0147?import=1",
  githubUrl: "https://github.com/akshitag001", // TODO: switch to the repo URL once it exists
  authorName: "Akshit",
  wisprUrl: "https://wisprflow.ai",
  challengeUrl: "https://www.wemakedevs.org/wispr",
};

export const nav = {
  links: [
    { label: "How it works", href: "#how-it-works" },
    { label: "Why voice", href: "#why-voice" },
    { label: "Integrity", href: "#integrity" },
  ],
  cta: "Open sample case",
};

export const hero = {
  headline: "Speak your investigation. Keep the evidence.",
  lead: "TraceTalk is an investigation notebook for security analysts. Describe what you see in the logs out loud, and it becomes a ledger of facts, hypotheses and open questions, each one linked to the exact log line behind it.",
  primary: "Open sample case",
  secondary: "Import your logs",
  note: "No signup. A sample incident with 61 real-format events is preloaded.",
  visual: {
    caseId: "IR-2026-0147",
    saidLabel: "What you said",
    recordedLabel: "What TraceTalk recorded",
    /** Dictation split into parts; filler parts render quieter. */
    dictation: [
      { text: "So, um, ", filler: true },
      {
        text: "at 14:32 the host made an unusual outbound connection. The process was launched by PowerShell. We haven't confirmed data exfiltration yet.",
        filler: false,
      },
    ],
    rows: [
      {
        id: "OBS-001",
        kind: "fact" as const,
        badge: "Confirmed",
        text: "Outbound connection to 203.0.113.77:443 at 14:32:07",
        chips: [{ id: "EVT-0017" }, { id: "EVT-0018" }],
      },
      {
        id: "OBS-002",
        kind: "fact" as const,
        badge: "Confirmed",
        text: "Connecting process rundll32.exe was launched by powershell.exe",
        chips: [{ id: "EVT-0015" }],
      },
      {
        id: "UNK-001",
        kind: "unknown" as const,
        badge: "Open",
        text: "Whether data was exfiltrated",
        chips: [{ id: "EVT-0048", note: "may answer" }],
      },
    ],
  },
};

export const problem = {
  heading: "Investigations lose their reasoning.",
  paragraphs: [
    "When you're tracing an attack, your hands and eyes are on the logs. Switching to a notes app breaks focus, so notes get written later, from memory.",
    "By the time the report is written, confirmed facts and educated guesses have blurred together.",
    "A reviewer reading “data was exfiltrated” can't tell which log line proved it, or whether anything did.",
  ],
  founderNote: {
    quote: "I built this because in my own blue-team labs I kept losing track of what I'd actually confirmed versus what I suspected.",
    name: "Akshit",
  },
};

export const howItWorks = {
  heading: "How it works",
  steps: [
    {
      title: "Load your logs.",
      body: "Import Sysmon, Windows Security, proxy and Defender events as JSONL. They land on one timeline, with repetitive noise grouped so the important events stand out.",
    },
    {
      title: "Say what you see.",
      body: "Select events, hold your Wispr Flow key and talk. Each statement becomes a fact, a hypothesis or an open question.",
    },
    {
      title: "Let the evidence check you.",
      body: "Facts are only marked confirmed when a log line backs them. Claims that conflict with the logs or with your earlier notes are flagged.",
    },
    {
      title: "Export a report a reviewer can trust.",
      body: "Every sentence cites its evidence, and the full trail of what you said, and when, is attached.",
    },
  ],
};

export const whyVoice = {
  heading: "Your hands stay on the evidence.",
  paragraphs: [
    "TraceTalk doesn't ship its own speech engine. Wispr Flow works system-wide: hold your Flow key, speak naturally, and polished text lands in TraceTalk's composer, the same way it lands in Slack or your editor.",
    "Flow removes filler words and fixes punctuation as you speak, so your notes read cleanly even when you think out loud.",
    "Analysts in India can narrate in Hinglish, and Flow handles it.",
    "Your eyes never leave the timeline. Select a row, hold the key, describe it, release, and move on.",
  ],
  details: [
    { label: "Hotkey", value: "Fn on Mac, Ctrl + Win on Windows (configurable in Flow)" },
    { label: "Works in", value: "the composer, ledger edits, contradiction notes" },
    { label: "Fallback", value: "browser speech input or typing, if Flow isn't installed" },
  ],
  builtByVoice: "This project was built by voice for the No Hands challenge. Specs, prompts, commit messages and docs were dictated with Wispr Flow.",
  wordsDictated: "[WORDS]", // TODO: from your Wispr Flow usage card, e.g. "48,210"
  wordsLabel: "words dictated",
};

export const integrity = {
  heading: "Nothing confirmed without a log line.",
  body: "Every evidence link must quote an exact field value from the event it cites. If the quoted value isn't in the log, the link is rejected and recorded in the activity trail. TraceTalk only structures what you said. It never adds findings of its own.",
  accepted: { eventId: "EVT-0015", field: "ParentImage", value: "…\\powershell.exe", note: "accepted" },
  rejected: { eventId: "EVT-0012", field: "ParentImage", value: "explorer.exe", note: "value not found" },
};

export const finalCta = {
  line: "Open the sample case and say something.",
  button: "Open sample case",
};

export const footer = {
  challenge: "Built for No Hands: The Wispr Challenge",
  challengeBy: "by WeMakeDevs × Wispr Flow",
  dataNote: "Sample data is synthetic. IPs use RFC 5737 documentation ranges.",
};

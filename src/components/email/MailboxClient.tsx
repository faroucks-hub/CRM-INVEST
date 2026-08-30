"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BadgeAlert,
  Bold,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Italic,
  Loader2,
  List,
  Mail,
  MailOpen,
  Menu,
  Paperclip,
  PenLine,
  Forward,
  RefreshCw,
  Reply,
  ReplyAll,
  Search,
  Send,
  Settings2,
  SlidersHorizontal,
  Star,
  Trash2,
  Underline,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Folder = "inbox" | "starred" | "important" | "sent" | "drafts" | "trash";
type Summary = {
  id: string;
  threadId: string;
  labels: string[];
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  internalDate: string;
};
type Detail = Summary & {
  cc: string;
  messageId: string;
  references?: string;
  importance?: string;
  html: string;
  text: string;
};
type CatalogueKey = "africa_fr" | "africa_en" | "international_fr" | "international_en";
type Attachment = { name: string; type: string; data?: string; size: number; catalogueKey?: CatalogueKey };
type CommunicationLanguage = "fr" | "en" | "unknown";
type CommunicationMarket = "africa" | "international" | "unknown";
type Draft = { to: string; cc: string; subject: string; body: string; importance: "normal" | "high"; attachments: Attachment[] };
type ContactSummary = { email_key: string; first_contacted_at: string | null; last_contacted_at: string | null; last_reply_at: string | null; outbound_count: number; inbound_count: number; history_checked_at: string | null; last_subject: string | null };
type ComposeFont = "sans" | "century-gothic" | "serif" | "mono";
type Preferences = { signature: string; signatureEnabled: boolean; replySignature: string; replySignatureEnabled: boolean; logoEnabled: boolean; suggestedSignature: string; font: ComposeFont };
const folders: { key: Folder; label: string; icon: typeof Inbox }[] = [
  { key: "inbox", label: "Boîte de réception", icon: Inbox },
  { key: "starred", label: "Suivis", icon: Star },
  { key: "important", label: "Importants", icon: BadgeAlert },
  { key: "sent", label: "Messages envoyés", icon: Send },
  { key: "drafts", label: "Brouillons", icon: PenLine },
  { key: "trash", label: "Corbeille", icon: Trash2 },
];
const initials = (value: string) => {
  const clean = value.replace(/<[^>]+>/g, "").trim();
  return (
    clean
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase() || "M"
  );
};
const sender = (value: string) =>
  value
    .replace(/<[^>]+>/g, "")
    .replace(/^"|"$/g, "")
    .trim() || "Expéditeur";
const address = (value: string) =>
  value.match(/<([^>]+)>/)?.[1] || value.trim();
const shortDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};
const compactBody = (value: string) => value.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const textToHtml = (value: string) => escapeHtml(value).replace(/\n/g, "<br>");
const signatureHtml = (value: string, enabled: boolean, logoEnabled: boolean) => {
  if (!enabled || !value.trim()) return "";
  const logo = logoEnabled ? '<td style="padding-right:14px;vertical-align:top"><img src="https://crm.im-energie.com/images/logo-ime-signature.png" alt="IM Énergie" width="92" style="display:block;width:92px;height:auto;border:0"></td>' : "";
  return `<br><br><table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;color:#10233f"><tr>${logo}<td style="vertical-align:top;border-left:2px solid #e2a719;padding-left:14px;font-size:13px;line-height:1.45">${textToHtml(value.trim())}</td></tr></table>`;
};
const catalogues: Record<CatalogueKey, { name: string; size: number }> = {
  africa_fr: { name: "IM_Energie_Catalogue_Afrique_2027_FR.pdf", size: 6_139_014 },
  africa_en: { name: "IM_Energie_Catalogue_Afrique_2027_EN.pdf", size: 5_099_872 },
  international_fr: { name: "IM_Energie_Catalogue_International_2027_FR.pdf", size: 5_240_900 },
  international_en: { name: "IM_Energie_General_Catalogue_2027_EN.pdf", size: 5_154_448 },
} as const;
const templateContent = (market: Exclude<CommunicationMarket, "unknown">, language: Exclude<CommunicationLanguage, "unknown">, contactName: string, company: string) => {
  const person = contactName.trim();
  const organisation = company.trim();
  if (market === "africa" && language === "fr") return {
    subject: `Présentation d’IM Énergie — Solutions pour vos projets${organisation ? ` — ${organisation}` : ""}`,
    body: `<p>${person ? `Bonjour ${escapeHtml(person)},` : "Madame, Monsieur,"}</p><p>Je vous contacte au nom d’IM Énergie, société basée à Istanbul qui accompagne des projets énergétiques industriels, notamment sur les marchés africains, en coordination avec des fabricants qualifiés.</p><p>Notre approche tient compte des exigences techniques, des conditions d’exploitation, de la logistique internationale et du suivi de fabrication jusqu’à la livraison.</p><p>Nous intervenons notamment sur les systèmes UPS industriels, redresseurs et chargeurs, onduleurs, convertisseurs de fréquence, stabilisateurs, solutions solaires et systèmes de stockage d’énergie.</p><p>Vous trouverez en pièce jointe notre documentation 2027 destinée aux marchés africains. Nous restons disponibles pour étudier vos besoins et définir une approche adaptée à votre projet.</p><p>Cordialement,</p>`,
  };
  if (market === "africa" && language === "en") return {
    subject: `Introducing IM Energy — Solutions for your projects${organisation ? ` — ${organisation}` : ""}`,
    body: `<p>${person ? `Dear ${escapeHtml(person)},` : "Dear Sir or Madam,"}</p><p>I am contacting you on behalf of IM Energy, an Istanbul-based company supporting industrial energy projects, particularly across African markets, in coordination with qualified manufacturers.</p><p>Our approach considers technical requirements, operating conditions, international logistics, and manufacturing follow-up through delivery.</p><p>Our scope includes industrial UPS systems, rectifiers and battery chargers, inverters, frequency converters, voltage stabilizers, solar solutions, and energy storage systems.</p><p>Please find attached our 2027 documentation for African markets. We would be pleased to review your requirements and discuss an approach suited to your project.</p><p>Kind regards,</p>`,
  };
  if (language === "fr") return {
    subject: `Présentation d’IM Énergie${organisation ? ` — ${organisation}` : ""}`,
    body: `<p>${person ? `Bonjour ${escapeHtml(person)},` : "Madame, Monsieur,"}</p><p>Je vous contacte au nom d’IM Énergie, société spécialisée dans l’accompagnement de projets énergétiques industriels et la mise en relation avec des fabricants qualifiés.</p><p>Nous intervenons notamment sur les systèmes UPS industriels, redresseurs et chargeurs, onduleurs, convertisseurs de fréquence, stabilisateurs, solutions solaires et systèmes de stockage d’énergie.</p><p>Vous trouverez en pièce jointe notre catalogue général international 2027. Nous restons disponibles pour étudier vos besoins techniques et vous proposer une approche adaptée à votre projet.</p><p>Cordialement,</p>`,
  };
  return {
    subject: `Introduction to IM Energy${organisation ? ` — ${organisation}` : ""}`,
    body: `<p>${person ? `Dear ${escapeHtml(person)},` : "Dear Sir or Madam,"}</p><p>I am contacting you on behalf of IM Energy, a company specializing in industrial energy projects and in connecting clients with qualified manufacturers.</p><p>Our scope includes industrial UPS systems, rectifiers and battery chargers, inverters, frequency converters, voltage stabilizers, solar solutions, and energy storage systems.</p><p>Please find attached our 2027 international general catalogue. We would be pleased to review your technical requirements and discuss an approach suited to your project.</p><p>Kind regards,</p>`,
  };
};
async function responseJson(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { throw new Error(`Réponse serveur invalide (${response.status})`); }
}

export default function MailboxClient({
  connected,
  email,
  initialTo = "",
  initialLeadId = "",
  initialClientId = "",
  initialContactName = "",
  initialCompany = "",
  initialLanguage = "unknown",
  initialMarket = "unknown",
}: {
  connected: boolean;
  email?: string;
  initialTo?: string;
  initialLeadId?: string;
  initialClientId?: string;
  initialContactName?: string;
  initialCompany?: string;
  initialLanguage?: string;
  initialMarket?: string;
}) {
  const [folder, setFolder] = useState<Folder>("inbox"),
    [messages, setMessages] = useState<Summary[]>([]),
    [selected, setSelected] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false),
    [detailLoading, setDetailLoading] = useState(false),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const [compose, setCompose] = useState(Boolean(initialTo)),
    [mobileFolders, setMobileFolders] = useState(false),
    [settingsOpen, setSettingsOpen] = useState(false),
    [sort, setSort] = useState<"newest" | "oldest" | "sender" | "unread">("newest"),
    [nextPage, setNextPage] = useState<string | null>(null),
    [pageTokens, setPageTokens] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({ signature: "", signatureEnabled: true, replySignature: "", replySignatureEnabled: true, logoEnabled: true, suggestedSignature: "", font: "sans" });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft>({
      to: initialTo,
      cc: "",
      subject: "",
      body: "",
      importance: "normal",
      attachments: [],
    }),
    [sending, setSending] = useState(false);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [contactSummary, setContactSummary] = useState<ContactSummary | null>(null);
  const [contactStatusLoading, setContactStatusLoading] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState<CommunicationLanguage>(initialLanguage === "fr" || initialLanguage === "en" ? initialLanguage : "unknown");
  const [templateMarket, setTemplateMarket] = useState<CommunicationMarket>(initialMarket === "africa" || initialMarket === "international" ? initialMarket : "unknown");
  const initialTemplateApplied = useRef(false);
  const currentFolder = folders.find((item) => item.key === folder)!;

  useEffect(() => {
    if (!connected) return;
    void fetch("/api/email/preferences").then(responseJson).then((data) => setPreferences({ signature: data.signature || "", signatureEnabled: data.signatureEnabled !== false, replySignature: data.replySignature || "", replySignatureEnabled: data.replySignatureEnabled !== false, logoEnabled: data.logoEnabled !== false, suggestedSignature: data.suggestedSignature || "", font: data.font || "sans" })).catch(() => undefined).finally(() => setPreferencesLoaded(true));
  }, [connected]);

  const attachCatalogue = useCallback(async (market: Exclude<CommunicationMarket, "unknown">, language: Exclude<CommunicationLanguage, "unknown">) => {
    const catalogueKey = `${market}_${language}` as CatalogueKey;
    const catalogue = catalogues[catalogueKey];
    return { name: catalogue.name, type: "application/pdf", size: catalogue.size, catalogueKey } satisfies Attachment;
  }, []);

  const applyTemplate = useCallback(async (market: Exclude<CommunicationMarket, "unknown">, language: Exclude<CommunicationLanguage, "unknown">) => {
    setCatalogueLoading(true);
    try {
      const content = templateContent(market, language, initialContactName, initialCompany);
      const attachment = await attachCatalogue(market, language);
      const manualAttachments = draft.attachments.filter((file) => !file.catalogueKey);
      const total = manualAttachments.reduce((sum, file) => sum + file.size, attachment.size);
      if (total > 10 * 1024 * 1024) throw new Error("Le catalogue et les autres pièces jointes dépassent 10 Mo");
      setDraft((current) => ({ ...current, subject: content.subject, body: `${content.body}${signatureHtml(preferences.signature, preferences.signatureEnabled, preferences.logoEnabled)}`, attachments: [...manualAttachments, attachment] }));
      toast.success(`${market === "africa" ? "Afrique" : "International"} — ${language === "fr" ? "Français" : "English"} ajouté`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Catalogue indisponible");
    } finally {
      setCatalogueLoading(false);
    }
  }, [attachCatalogue, draft.attachments, initialCompany, initialContactName, preferences]);

  useEffect(() => {
    if (!connected || !preferencesLoaded || !initialTo || initialTemplateApplied.current) return;
    if ((initialLanguage !== "fr" && initialLanguage !== "en") || (initialMarket !== "africa" && initialMarket !== "international")) return;
    initialTemplateApplied.current = true;
    void applyTemplate(initialMarket, initialLanguage);
  }, [applyTemplate, connected, initialLanguage, initialMarket, initialTo, preferencesLoaded]);

  useEffect(() => {
    const recipient = draft.to.trim().toLowerCase();
    if (!connected || !compose || !/^\S+@\S+\.\S+$/.test(recipient)) {
      setContactSummary(null);
      return;
    }
    const timeout = window.setTimeout(async () => {
      setContactStatusLoading(true);
      try {
        const params = new URLSearchParams({ email: recipient });
        const matchesInitialContact = recipient === initialTo.trim().toLowerCase();
        if (matchesInitialContact && initialClientId) params.set("clientId", initialClientId);
        if (matchesInitialContact && initialLeadId) params.set("leadId", initialLeadId);
        const response = await fetch(`/api/email/contact-status?${params}`);
        const data = await responseJson(response);
        if (!response.ok) throw new Error(data.error);
        setContactSummary(data.summary ?? null);
      } catch (error) {
        setContactSummary(null);
        toast.error(error instanceof Error ? error.message : "Historique du contact indisponible");
      } finally {
        setContactStatusLoading(false);
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [compose, connected, draft.to, initialClientId, initialLeadId, initialTo]);

  const newMessage = () => {
    setSelected(null);
    setDraft({ to: initialTo, cc: "", subject: "", body: signatureHtml(preferences.signature, preferences.signatureEnabled, preferences.logoEnabled), importance: "normal", attachments: [] });
    setCompose(true);
  };

  const load = useCallback(
    async (token = "") => {
      if (!connected) return;
      setLoading(true);
      try {
        const p = new URLSearchParams({ folder });
        if (query) p.set("q", query);
        if (token) p.set("pageToken", token);
        const r = await fetch(`/api/email/messages?${p}`);
        const data = await responseJson(r);
        if (!r.ok) throw new Error(data.error);
        setMessages(data.messages || []);
        setNextPage(data.nextPageToken);
        setSelected(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Chargement impossible");
      } finally {
        setLoading(false);
      }
    },
    [connected, folder, query],
  );
  useEffect(() => {
    setPageTokens([]);
    void load();
  }, [load]);
  const open = async (item: Summary) => {
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/email/messages/${item.id}`);
      const data = await responseJson(r);
      if (!r.ok) throw new Error(data.error);
      setSelected({ ...item, ...data });
      setMessages((list) =>
        list.map((m) =>
          m.id === item.id
            ? { ...m, labels: m.labels.filter((x) => x !== "UNREAD") }
            : m,
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lecture impossible");
    } finally {
      setDetailLoading(false);
    }
  };
  const act = async (action: string) => {
    if (!selected) return;
    const r = await fetch(`/api/email/messages/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await responseJson(r);
    if (!r.ok) return toast.error(data.error);
    toast.success(
      action === "trash"
        ? "Message placé dans la corbeille"
        : "Message mis à jour",
    );
    setSelected(null);
    void load();
  };
  const reply = () => {
    if (!selected) return;
    setDraft({
      to: address(selected.from),
      cc: "",
      subject: selected.subject.startsWith("Re:")
        ? selected.subject
        : `Re: ${selected.subject}`,
      body: `${signatureHtml(preferences.replySignature || preferences.signature, preferences.replySignatureEnabled, preferences.logoEnabled)}<br><br><hr><p><strong>Message précédent</strong></p><p>${textToHtml(compactBody(selected.text || selected.snippet))}</p>`,
      importance: "normal",
      attachments: [],
    });
    setCompose(true);
  };
  const replyAll = () => {
    if (!selected) return;
    setDraft({
      to: address(selected.from),
      cc: [selected.to, selected.cc].filter(Boolean).join(", "),
      subject: selected.subject.startsWith("Re:") ? selected.subject : `Re: ${selected.subject}`,
      body: `${signatureHtml(preferences.replySignature || preferences.signature, preferences.replySignatureEnabled, preferences.logoEnabled)}<br><br><hr><p><strong>Message précédent</strong></p><p>${textToHtml(compactBody(selected.text || selected.snippet))}</p>`,
      importance: "normal",
      attachments: [],
    });
    setCompose(true);
  };
  const forward = () => {
    if (!selected) return;
    setDraft({
      to: "",
      cc: "",
      subject: selected.subject.startsWith("Tr:") ? selected.subject : `Tr: ${selected.subject}`,
      body: `<br><br><hr><p><strong>Message transféré</strong><br>De : ${escapeHtml(selected.from)}<br>Date : ${escapeHtml(selected.date)}<br>Objet : ${escapeHtml(selected.subject)}</p><p>${textToHtml(compactBody(selected.text || selected.snippet))}</p>${signatureHtml(preferences.signature, preferences.signatureEnabled, preferences.logoEnabled)}`,
      importance: "normal",
      attachments: [],
    });
    setCompose(true);
  };
  const sendMail = async () => {
    if (!draft.to.trim()) return toast.error("Destinataire requis");
    const matchesInitialContact = draft.to.trim().toLowerCase() === initialTo.trim().toLowerCase();
    setSending(true);
    try {
      const r = await fetch("/api/email/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          threadId: selected?.threadId,
          replyToMessageId: selected?.messageId,
          leadId: matchesInitialContact ? initialLeadId || undefined : undefined,
          clientId: matchesInitialContact ? initialClientId || undefined : undefined,
          followUpDate: followUpDate || undefined,
        }),
      });
      const data = await responseJson(r);
      if (!r.ok) throw new Error(data.error);
      toast.success("Message envoyé");
      setCompose(false);
      setFollowUpDate("");
      setDraft({ to: initialTo, cc: "", subject: "", body: "", importance: "normal", attachments: [] });
      if (folder === "sent") void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  };
  const displayed = useMemo(() => [...messages].sort((a, b) => {
    if (sort === "sender") return sender(a.from).localeCompare(sender(b.from), "fr");
    if (sort === "unread") return Number(b.labels.includes("UNREAD")) - Number(a.labels.includes("UNREAD"));
    const delta = new Date(b.date || Number(b.internalDate)).getTime() - new Date(a.date || Number(a.internalDate)).getTime();
    return sort === "oldest" ? -delta : delta;
  }), [messages, sort]);
  if (!connected) return <ConnectScreen />;

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-8.25rem)] min-h-[610px] w-full max-w-[1900px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-30 w-72 shrink-0 border-r border-slate-200 bg-white p-4 transition-transform lg:static lg:w-[30%] lg:translate-x-0 min-[1500px]:w-[15%]",
          mobileFolders ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-5 flex items-center justify-between px-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">
              Messagerie
            </p>
            <p className="mt-1 max-w-[190px] truncate text-sm font-semibold text-navy-950">
              {email}
            </p>
          </div>
          <button
            className="rounded-lg p-2 text-slate-400 lg:hidden"
            onClick={() => setMobileFolders(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => { newMessage(); setMobileFolders(false); }}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
        >
          <PenLine className="h-4 w-4" />
          Nouveau message
        </button>
        <nav className="space-y-1">
          {folders.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setFolder(item.key);
                  setMobileFolders(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium",
                  folder === item.key
                    ? "bg-gold-50 text-gold-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-navy-950",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <button onClick={() => setSettingsOpen(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-100">
            <Settings2 className="h-4 w-4" /> Signature et rédaction
          </button>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Google Workspace connecté
          </div>
          </div>
        </div>
      </aside>
      {mobileFolders && (
        <button
          aria-label="Fermer"
          className="fixed inset-0 z-20 bg-navy-950/30 lg:hidden"
          onClick={() => setMobileFolders(false)}
        />
      )}

      <section
        className={cn(
          "min-w-0 flex-col border-r border-slate-200 lg:w-[70%] lg:flex-none min-[1500px]:flex min-[1500px]:w-[20%]",
          selected ? "hidden min-[1500px]:flex" : "flex flex-1",
        )}
      >
        <header className="border-b border-slate-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFolders(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-navy-950">
                {currentFolder.label}
              </h1>
              <p className="text-xs text-slate-400">
                {messages.length} message{messages.length !== 1 ? "s" : ""}{" "}
                affiché{messages.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => load(pageTokens.at(-1) || "")}
              disabled={loading}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
            <label className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Trier les messages">
              <SlidersHorizontal className="h-4 w-4" />
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="absolute inset-0 cursor-pointer opacity-0">
                <option value="newest">Plus récents</option>
                <option value="oldest">Plus anciens</option>
                <option value="sender">Expéditeur</option>
                <option value="unread">Non lus d’abord</option>
              </select>
            </label>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search.trim());
            }}
            className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-gold-400 focus-within:bg-white"
          >
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder="Rechercher dans les messages…"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setQuery("");
                }}
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </form>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <Loading />
          ) : displayed.length === 0 ? (
            <Empty folder={currentFolder.label} />
          ) : (
            displayed.map((item) => {
              const unread = item.labels.includes("UNREAD");
              return (
                <button
                  key={item.id}
                  onClick={() => open(item)}
                  className={cn(
                    "w-full border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50",
                    unread && "bg-gold-50/30",
                  )}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        unread
                          ? "bg-navy-900 text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {initials(folder === "sent" ? item.to : item.from)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm text-navy-950",
                            unread ? "font-bold" : "font-semibold",
                          )}
                        >
                          {sender(folder === "sent" ? item.to : item.from)}
                        </p>
                        <span className="shrink-0 text-[11px] text-slate-400">
                          {shortDate(item.date || item.internalDate)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "mt-1 truncate text-sm",
                          unread
                            ? "font-semibold text-slate-800"
                            : "text-slate-600",
                        )}
                      >
                        {item.subject}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                        {item.snippet}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
        <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-400">
          <span>Page {pageTokens.length + 1}</span>
          <div className="flex gap-1">
            <button
              disabled={!pageTokens.length}
              onClick={() => {
                const tokens = pageTokens.slice(0, -1);
                setPageTokens(tokens);
                void load(tokens.at(-1) || "");
              }}
              className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={!nextPage}
              onClick={() => {
                setPageTokens((v) => [...v, nextPage!]);
                void load(nextPage!);
              }}
              className="rounded-lg p-2 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>

      <section
        className={cn(
          "min-w-0 flex-1 flex-col bg-slate-50/40 min-[1500px]:w-[65%] min-[1500px]:flex-none",
          selected ? "flex" : "hidden min-[1500px]:flex",
        )}
      >
        {detailLoading ? (
          <Loading />
        ) : selected ? (
          <MessageView
            message={selected}
            onBack={() => setSelected(null)}
            onReply={reply}
            onReplyAll={replyAll}
            onForward={forward}
            onAction={act}
          />
        ) : (
          <Welcome />
        )}
      </section>
      {compose && (
        <Compose
          draft={draft}
          setDraft={setDraft}
          sending={sending}
          onClose={() => setCompose(false)}
          onSend={sendMail}
          preferences={preferences}
          catalogueLoading={catalogueLoading}
          templateLanguage={templateLanguage}
          templateMarket={templateMarket}
          onTemplateLanguageChange={setTemplateLanguage}
          onTemplateMarketChange={setTemplateMarket}
          onApplyTemplate={applyTemplate}
          contactSummary={contactSummary}
          contactStatusLoading={contactStatusLoading}
          followUpDate={followUpDate}
          onFollowUpDateChange={setFollowUpDate}
        />
      )}
      {settingsOpen && <SettingsPanel email={email || ""} value={preferences} onChange={setPreferences} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function ConnectScreen() {
  return (
    <div className="mx-auto flex min-h-[560px] max-w-4xl items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-gold-400">
          <Mail className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-navy-950">
          Votre messagerie professionnelle
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Consultez, recherchez et répondez à vos e-mails Google Workspace sans
          quitter le CRM.
        </p>
        <a
          href="/api/email/google/connect"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gold-400 px-6 py-3 text-sm font-bold text-navy-950 hover:bg-gold-300"
        >
          Connecter ma boîte Google
        </a>
        <p className="mt-4 text-xs text-slate-400">
          Chaque utilisateur connecte uniquement sa propre boîte.
        </p>
      </div>
    </div>
  );
}
function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-12 text-slate-400">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Chargement…
    </div>
  );
}
function Empty({ folder }: { folder: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <MailOpen className="h-10 w-10 text-slate-300" />
      <p className="mt-4 font-semibold text-slate-600">Aucun message</p>
      <p className="mt-1 text-xs text-slate-400">
        Le dossier « {folder} » est vide.
      </p>
    </div>
  );
}
function Welcome() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-gold-500 shadow-sm ring-1 ring-slate-200">
        <Mail className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-lg font-bold text-navy-950">
        Sélectionnez un message
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
        Le contenu du message s’affichera ici pour vous permettre de le traiter
        sans quitter la liste.
      </p>
    </div>
  );
}
function MessageView({
  message,
  onBack,
  onReply,
  onReplyAll,
  onForward,
  onAction,
}: {
  message: Detail;
  onBack: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onAction: (a: string) => void;
}) {
  return (
    <>
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Retour</span>
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          onClick={onReply}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-100"
        >
          <Reply className="h-4 w-4" />
          Répondre
        </button>
        <button onClick={onReplyAll} title="Répondre à tous" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-100 sm:flex">
          <ReplyAll className="h-4 w-4" /><span className="hidden xl:inline">Tous</span>
        </button>
        <button onClick={onForward} title="Transférer" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-100 sm:flex">
          <Forward className="h-4 w-4" /><span className="hidden xl:inline">Transférer</span>
        </button>
        <div className="ml-auto flex">
          <button title="Archiver" onClick={() => onAction("archive")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Archive className="h-4 w-4" /></button>
          <button
            title="Marquer non lu"
            onClick={() => onAction("unread")}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <Mail className="h-4 w-4" />
          </button>
          <button
            title={
              message.labels.includes("STARRED") ? "Retirer le suivi" : "Suivre"
            }
            onClick={() =>
              onAction(message.labels.includes("STARRED") ? "unstar" : "star")
            }
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <Star
              className={cn(
                "h-4 w-4",
                message.labels.includes("STARRED") &&
                  "fill-gold-400 text-gold-400",
              )}
            />
          </button>
          <button title={message.labels.includes("IMPORTANT") ? "Retirer Important" : "Marquer Important"} onClick={() => onAction(message.labels.includes("IMPORTANT") ? "unimportant" : "important")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <BadgeAlert className={cn("h-4 w-4", message.labels.includes("IMPORTANT") && "fill-amber-100 text-amber-600")} />
          </button>
          <button
            title="Supprimer"
            onClick={() =>
              onAction(message.labels.includes("TRASH") ? "restore" : "trash")
            }
            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            {message.labels.includes("TRASH") ? (
              <Archive className="h-4 w-4" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
        <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-7">
            <h2 className="text-xl font-bold leading-snug text-navy-950 sm:text-2xl">
              {message.subject}
            </h2>
            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                {initials(message.from)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-navy-950">
                  {sender(message.from)}
                </p>
                <p className="truncate text-xs text-slate-400">
                  À : {message.to}
                </p>
                {message.cc && <p className="truncate text-xs text-slate-400">Cc : {message.cc}</p>}
              </div>
              <time className="shrink-0 text-xs text-slate-400">
                {new Date(message.date).toLocaleString("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </div>
          </div>
          <div className="min-h-[300px] p-5 text-sm leading-6 text-slate-700 sm:p-7">
            {message.html ? (
              <iframe
                sandbox=""
                title="Contenu du message"
                srcDoc={message.html}
                className="min-h-[420px] w-full border-0 bg-white"
              />
            ) : (
              <div className="whitespace-pre-line break-words">
                {compactBody(message.text || message.snippet)}
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 p-5">
            <button
              onClick={onReply}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-navy-900 hover:bg-slate-50"
            >
              <Reply className="h-4 w-4" />
              Répondre
            </button>
            <button onClick={onReplyAll} className="ml-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-navy-900 hover:bg-slate-50"><ReplyAll className="h-4 w-4" />Répondre à tous</button>
          </div>
        </article>
      </div>
    </>
  );
}
function Compose({
  draft,
  setDraft,
  sending,
  onClose,
  onSend,
  preferences,
  catalogueLoading,
  templateLanguage,
  templateMarket,
  onTemplateLanguageChange,
  onTemplateMarketChange,
  onApplyTemplate,
  contactSummary,
  contactStatusLoading,
  followUpDate,
  onFollowUpDateChange,
}: {
  draft: Draft;
  setDraft: (v: Draft) => void;
  sending: boolean;
  onClose: () => void;
  onSend: () => void;
  preferences: Preferences;
  catalogueLoading: boolean;
  templateLanguage: CommunicationLanguage;
  templateMarket: CommunicationMarket;
  onTemplateLanguageChange: (value: CommunicationLanguage) => void;
  onTemplateMarketChange: (value: CommunicationMarket) => void;
  onApplyTemplate: (market: Exclude<CommunicationMarket, "unknown">, language: Exclude<CommunicationLanguage, "unknown">) => Promise<void>;
  contactSummary: ContactSummary | null;
  contactStatusLoading: boolean;
  followUpDate: string;
  onFollowUpDateChange: (value: string) => void;
}) {
  const addAttachments = async (files: FileList | null) => {
    if (!files) return;
    const selectedFiles = Array.from(files).slice(0, 5 - draft.attachments.length);
    const manualExisting = draft.attachments.filter((file) => !file.catalogueKey).reduce((sum, file) => sum + file.size, 0);
    const manualTotal = selectedFiles.reduce((sum, file) => sum + file.size, manualExisting);
    const total = selectedFiles.reduce((sum, file) => sum + file.size, draft.attachments.reduce((sum, file) => sum + file.size, 0));
    if (manualTotal > 3 * 1024 * 1024) return toast.error("Les fichiers ajoutés manuellement sont limités à 3 Mo par envoi");
    if (total > 10 * 1024 * 1024) return toast.error("Le catalogue et les autres pièces jointes dépassent 10 Mo");
    const encoded = await Promise.all(selectedFiles.map((file) => new Promise<Attachment>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, type: file.type || "application/octet-stream", data: String(reader.result), size: file.size });
      reader.onerror = () => reject(new Error(`Lecture impossible : ${file.name}`));
      reader.readAsDataURL(file);
    })));
    setDraft({ ...draft, attachments: [...draft.attachments, ...encoded] });
  };
  const fontStyle = preferences.font === "century-gothic" ? { fontFamily: '"Century Gothic", "Avenir Next", Arial, sans-serif' } : undefined;
  const fontClass = preferences.font === "serif" ? "font-serif" : preferences.font === "mono" ? "font-mono" : "font-sans";
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-end bg-navy-950/25 p-0 sm:p-5">
      <div className="flex h-[min(720px,92dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-center justify-between bg-navy-900 px-5 py-4 text-white">
          <div>
            <h2 className="font-bold">Nouveau message</h2>
            <p className="text-xs text-white/50">Messagerie IM Énergie</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          <label className="block border-b border-slate-200 py-2 text-xs font-semibold text-slate-400">
            À
            <input
              autoFocus
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
              className="ml-4 w-[calc(100%-3rem)] text-sm font-medium text-slate-800 outline-none"
              placeholder="client@entreprise.com"
            />
          </label>
          {draft.to.trim() && (
            <div className={cn(
              "mt-3 rounded-xl border px-3.5 py-3 text-xs",
              contactStatusLoading ? "border-slate-200 bg-slate-50 text-slate-500" :
              contactSummary && contactSummary.outbound_count > 0 ? "border-amber-200 bg-amber-50 text-amber-900" :
              contactSummary?.history_checked_at ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"
            )}>
              {contactStatusLoading ? (
                <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Vérification de l’historique Gmail…</span>
              ) : contactSummary && contactSummary.outbound_count > 0 ? (
                <div>
                  <p className="font-bold">Déjà contacté · {contactSummary.outbound_count} message{contactSummary.outbound_count > 1 ? "s" : ""} envoyé{contactSummary.outbound_count > 1 ? "s" : ""}</p>
                  <p className="mt-1 text-amber-700">Dernier contact : {contactSummary.last_contacted_at ? new Date(contactSummary.last_contacted_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "date indisponible"}{contactSummary.inbound_count > 0 ? ` · ${contactSummary.inbound_count} réponse${contactSummary.inbound_count > 1 ? "s" : ""}` : " · aucune réponse trouvée"}</p>
                </div>
              ) : contactSummary?.history_checked_at ? (
                <p className="font-semibold">Jamais contacté depuis la boîte Gmail connectée</p>
              ) : (
                <p>Historique à vérifier avant l’envoi.</p>
              )}
            </div>
          )}
          <label className="block border-b border-slate-200 py-2 text-xs font-semibold text-slate-400">
            Cc
            <input
              value={draft.cc}
              onChange={(e) => setDraft({ ...draft, cc: e.target.value })}
              className="ml-4 w-[calc(100%-3rem)] text-sm text-slate-800 outline-none"
            />
          </label>
          <input
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            className="w-full border-b border-slate-200 py-4 text-sm font-semibold outline-none"
            placeholder="Objet"
          />
          <div className="border-b border-slate-200 py-3">
            <span className="text-xs font-semibold text-slate-400">Présentation commerciale</span>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select value={templateMarket} onChange={(event) => onTemplateMarketChange(event.target.value as CommunicationMarket)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-gold-400">
                <option value="unknown">Marché à déterminer</option>
                <option value="africa">Afrique</option>
                <option value="international">International</option>
              </select>
              <select value={templateLanguage} onChange={(event) => onTemplateLanguageChange(event.target.value as CommunicationLanguage)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-gold-400">
                <option value="unknown">Langue à déterminer</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
              <button type="button" disabled={catalogueLoading || templateMarket === "unknown" || templateLanguage === "unknown"} onClick={() => { if (templateMarket !== "unknown" && templateLanguage !== "unknown") void onApplyTemplate(templateMarket, templateLanguage); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold-400 bg-gold-50 px-3 py-2 text-xs font-semibold text-gold-800 hover:bg-gold-100 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400">
                {catalogueLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Appliquer
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-slate-400">Le modèle remplace l’objet et le corps actuels. Vérifiez toujours le message et la pièce jointe avant l’envoi.</p>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200 py-2">
            <span className="text-xs font-semibold text-slate-400">Priorité</span>
            <select value={draft.importance} onChange={(e) => setDraft({ ...draft, importance: e.target.value as Draft["importance"] })} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none">
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
            </select>
          </div>
          <div className="border-b border-slate-200 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400">Prochaine relance</span>
              <div className="flex gap-1.5">
                {[3, 7].map((days) => <button key={days} type="button" onClick={() => { const date = new Date(); date.setDate(date.getDate() + days); onFollowUpDateChange(date.toISOString().slice(0, 10)); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-gold-400 hover:bg-gold-50">+{days} jours</button>)}
                {followUpDate && <button type="button" onClick={() => onFollowUpDateChange("")} className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-red-600">Aucune</button>}
              </div>
            </div>
            <input type="date" value={followUpDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => onFollowUpDateChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-gold-400" />
            <p className="mt-1.5 text-[11px] text-slate-400">Après l’envoi réussi, la relance sera créée dans Tâches & Relances.</p>
          </div>
          <RichTextEditor value={draft.body} onChange={(body) => setDraft({ ...draft, body })} className={fontClass} style={fontStyle} />
          {draft.attachments.length > 0 && <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">{draft.attachments.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600"><Paperclip className="h-3.5 w-3.5"/><span className="max-w-48 truncate">{file.name}</span><button onClick={() => setDraft({ ...draft, attachments: draft.attachments.filter((_, i) => i !== index) })} className="text-slate-400 hover:text-red-600"><X className="h-3.5 w-3.5"/></button></span>)}</div>}
        </div>
        <footer className="flex items-center gap-3 border-t border-slate-200 px-5 py-4">
          <button
            onClick={onSend}
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-6 py-2.5 text-sm font-bold text-navy-950 hover:bg-gold-300 disabled:opacity-60"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Envoyer
          </button>
          <label title="Ajouter une pièce jointe" className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <Paperclip className="h-5 w-5" />
            <input type="file" multiple className="hidden" onChange={(e) => { void addAttachments(e.target.files); e.currentTarget.value = ""; }} />
          </label>
          <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
            <Check className="h-3.5 w-3.5" />
            Connexion sécurisée
          </span>
        </footer>
      </div>
    </div>
  );
}

function RichTextEditor({ value, onChange, className, style }: { value: string; onChange: (value: string) => void; className?: string; style?: React.CSSProperties }) {
  const editor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== value) editor.current.innerHTML = value;
  }, [value]);
  const command = (name: string) => {
    editor.current?.focus();
    document.execCommand(name, false);
    if (editor.current) onChange(editor.current.innerHTML);
  };
  const tools = [
    { name: "bold", label: "Gras", icon: Bold },
    { name: "italic", label: "Italique", icon: Italic },
    { name: "underline", label: "Souligné", icon: Underline },
    { name: "insertUnorderedList", label: "Liste", icon: List },
  ];
  return <div className="py-3">
    <div className="flex items-center gap-1 rounded-t-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
      {tools.map((tool) => <button key={tool.name} type="button" title={tool.label} onMouseDown={(event) => event.preventDefault()} onClick={() => command(tool.name)} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-navy-900"><tool.icon className="h-4 w-4" /></button>)}
    </div>
    <div ref={editor} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder="Rédigez votre message…" onInput={(event) => onChange(event.currentTarget.innerHTML)} className={cn("min-h-[260px] w-full overflow-y-auto rounded-b-xl border-x border-b border-slate-200 p-4 text-sm leading-6 outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] focus:border-gold-400", className)} style={style} />
  </div>;
}

function SignatureField({ label, enabled, value, onEnabled, onValue }: { label: string; enabled: boolean; value: string; onEnabled: (value: boolean) => void; onValue: (value: string) => void }) {
  return <div>
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <button type="button" role="switch" aria-checked={enabled} onClick={() => onEnabled(!enabled)} className={cn("relative h-6 w-11 rounded-full transition-colors", enabled ? "bg-gold-400" : "bg-slate-300")}>
        <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform", enabled ? "left-6" : "left-1")} />
      </button>
    </div>
    <textarea disabled={!enabled} value={value} onChange={(event) => onValue(event.target.value)} rows={3} maxLength={2000} placeholder="Saisissez votre signature…" className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-gold-400 disabled:bg-slate-50 disabled:text-slate-400" />
    <span className="mt-1 block text-right text-xs text-slate-400">{value.length}/2000</span>
  </div>;
}

function SettingsPanel({ email, value, onChange, onClose }: { email: string; value: Preferences; onChange: (value: Preferences) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/email/preferences", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
      const data = await responseJson(response);
      if (!response.ok) throw new Error(data.error);
      onChange(draft);
      toast.success("Préférences enregistrées");
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Enregistrement impossible"); }
    finally { setSaving(false); }
  };
  const preview = draft.signatureEnabled ? draft.signature : draft.replySignatureEnabled ? draft.replySignature : "";
  const previewStyle = draft.font === "century-gothic" ? { fontFamily: '\"Century Gothic\", \"Avenir Next\", Arial, sans-serif' } : undefined;
  const previewClass = draft.font === "serif" ? "font-serif" : draft.font === "mono" ? "font-mono" : "font-sans";
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/35 p-3 sm:p-5">
    <div className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4"><div className="min-w-0"><h2 className="font-bold text-navy-950">Signature et rédaction</h2><p className="mt-1 truncate text-xs text-slate-400">Préférences personnelles pour {email}</p></div><button onClick={onClose} className="ml-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5"/></button></header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <label className="block"><span className="text-sm font-semibold text-slate-700">Police de rédaction</span><select value={draft.font} onChange={(e) => setDraft({ ...draft, font: e.target.value as Preferences["font"] })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-gold-400"><option value="sans">Sans serif — recommandée</option><option value="century-gothic">Century Gothic</option><option value="serif">Serif</option><option value="mono">Monospace</option></select><span className="mt-1 block text-xs text-slate-400">Arial est utilisée en repli si Century Gothic n’est pas installée.</span></label>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><div><p className="text-sm font-semibold text-slate-700">Logo officiel IM Énergie</p><p className="mt-0.5 text-xs text-slate-400">Dimensionné automatiquement dans la signature.</p></div><button type="button" role="switch" aria-checked={draft.logoEnabled} onClick={() => setDraft({ ...draft, logoEnabled: !draft.logoEnabled })} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", draft.logoEnabled ? "bg-gold-400" : "bg-slate-300")}><span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform", draft.logoEnabled ? "left-6" : "left-1")} /></button></div>
        {draft.suggestedSignature && <button type="button" onClick={() => setDraft({ ...draft, signature: draft.suggestedSignature, replySignature: draft.suggestedSignature, signatureEnabled: true, replySignatureEnabled: true })} className="w-full rounded-xl border border-gold-300 bg-gold-50 px-4 py-2.5 text-sm font-semibold text-navy-900 hover:bg-gold-100">Créer la signature standard IM Énergie</button>}
        <SignatureField label="Signature — nouveaux messages" enabled={draft.signatureEnabled} value={draft.signature} onEnabled={(signatureEnabled) => setDraft({ ...draft, signatureEnabled })} onValue={(signature) => setDraft({ ...draft, signature })} />
        <div className="flex justify-end"><button type="button" onClick={() => setDraft({ ...draft, replySignature: draft.signature, replySignatureEnabled: draft.signatureEnabled })} disabled={!draft.signature.trim()} className="text-xs font-semibold text-navy-800 hover:text-gold-600 disabled:cursor-not-allowed disabled:text-slate-300">Utiliser la même signature pour les réponses</button></div>
        <SignatureField label="Signature — réponses et transferts" enabled={draft.replySignatureEnabled} value={draft.replySignature} onEnabled={(replySignatureEnabled) => setDraft({ ...draft, replySignatureEnabled })} onValue={(replySignature) => setDraft({ ...draft, replySignature })} />
        {preview.trim() && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Aperçu</p><div className="flex items-start gap-3">{draft.logoEnabled && <Image src="/images/logo-ime-signature.png" alt="IM Énergie" width={92} height={85} className="h-auto w-[92px] shrink-0" />}<div className={cn("whitespace-pre-line border-l-2 border-gold-400 pl-3 text-sm leading-5 text-slate-700", previewClass)} style={previewStyle}>{preview}</div></div></div>}
      </div>
      <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4"><button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button><button onClick={() => void save()} disabled={saving} className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-800 disabled:opacity-60">{saving ? "Enregistrement…" : "Enregistrer"}</button></footer>
    </div>
  </div>;
}

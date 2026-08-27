"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Menu,
  MoreHorizontal,
  Paperclip,
  PenLine,
  RefreshCw,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Folder = "inbox" | "starred" | "sent" | "drafts" | "trash";
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
  html: string;
  text: string;
};
const folders: { key: Folder; label: string; icon: typeof Inbox }[] = [
  { key: "inbox", label: "Boîte de réception", icon: Inbox },
  { key: "starred", label: "Suivis", icon: Star },
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

export default function MailboxClient({
  connected,
  email,
}: {
  connected: boolean;
  email: string;
}) {
  const [folder, setFolder] = useState<Folder>("inbox"),
    [messages, setMessages] = useState<Summary[]>([]),
    [selected, setSelected] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false),
    [detailLoading, setDetailLoading] = useState(false),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const [compose, setCompose] = useState(false),
    [mobileFolders, setMobileFolders] = useState(false),
    [nextPage, setNextPage] = useState<string | null>(null),
    [pageTokens, setPageTokens] = useState<string[]>([]);
  const [draft, setDraft] = useState({ to: "", cc: "", subject: "", body: "" }),
    [sending, setSending] = useState(false);
  const currentFolder = folders.find((item) => item.key === folder)!;

  const load = useCallback(
    async (token = "") => {
      if (!connected) return;
      setLoading(true);
      try {
        const p = new URLSearchParams({ folder });
        if (query) p.set("q", query);
        if (token) p.set("pageToken", token);
        const r = await fetch(`/api/email/messages?${p}`);
        const data = await r.json();
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
      const data = await r.json();
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
    const data = await r.json();
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
      body: "\n\n---\n" + selected.snippet,
    });
    setCompose(true);
  };
  const sendMail = async () => {
    if (!draft.to.trim()) return toast.error("Destinataire requis");
    setSending(true);
    try {
      const r = await fetch("/api/email/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          threadId: selected?.threadId,
          replyToMessageId: selected?.messageId,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      toast.success("Message envoyé");
      setCompose(false);
      setDraft({ to: "", cc: "", subject: "", body: "" });
      if (folder === "sent") void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  };
  const displayed = useMemo(() => messages, [messages]);
  if (!connected) return <ConnectScreen />;

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.25rem)] min-h-[610px] w-full max-w-[1700px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <aside
        className={cn(
          "absolute inset-y-0 left-0 z-30 w-72 border-r border-slate-200 bg-white p-4 transition-transform lg:static lg:translate-x-0",
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
          onClick={() => {
            setCompose(true);
            setMobileFolders(false);
          }}
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
        <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Google Workspace connecté
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
          "min-w-0 flex-col border-r border-slate-200 lg:flex lg:w-[410px] lg:flex-none xl:w-[470px]",
          selected ? "hidden" : "flex flex-1",
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
          "min-w-0 flex-1 flex-col bg-slate-50/40",
          selected ? "flex" : "hidden lg:flex",
        )}
      >
        {detailLoading ? (
          <Loading />
        ) : selected ? (
          <MessageView
            message={selected}
            onBack={() => setSelected(null)}
            onReply={reply}
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
        />
      )}
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
  onAction,
}: {
  message: Detail;
  onBack: () => void;
  onReply: () => void;
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
        <div className="ml-auto flex">
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
          <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
        <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-7">
            <h2 className="text-xl font-bold leading-snug text-navy-950 sm:text-2xl">
              {message.subject}
            </h2>
            <div className="mt-5 flex items-start gap-3">
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
              </div>
              <time className="shrink-0 text-xs text-slate-400">
                {new Date(message.date).toLocaleString("fr-FR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </div>
          </div>
          <div className="min-h-[300px] p-5 text-sm leading-7 text-slate-700 sm:p-7">
            {message.html ? (
              <iframe
                sandbox=""
                title="Contenu du message"
                srcDoc={message.html}
                className="min-h-[420px] w-full border-0 bg-white"
              />
            ) : (
              <div className="whitespace-pre-wrap">
                {message.text || message.snippet}
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
}: {
  draft: { to: string; cc: string; subject: string; body: string };
  setDraft: (v: any) => void;
  sending: boolean;
  onClose: () => void;
  onSend: () => void;
}) {
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
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            className="min-h-[330px] w-full resize-none py-5 text-sm leading-6 outline-none"
            placeholder="Rédigez votre message…"
          />
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
          <button
            title="Pièce jointe — prochaine version"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
            <Check className="h-3.5 w-3.5" />
            Connexion sécurisée
          </span>
        </footer>
      </div>
    </div>
  );
}

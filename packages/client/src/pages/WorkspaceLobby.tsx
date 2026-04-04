import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface Workspace {
  id: string;
  name: string;
  invite_code: string;
}

interface Props {
  user: User;
  onEnter: (workspace: { id: string; name: string }) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

// Pick a gradient accent per workspace based on its name
const CARD_GRADIENTS = [
  "linear-gradient(135deg, #6c63ff, #3b82f6)",
  "linear-gradient(135deg, #3b82f6, #06b6d4)",
  "linear-gradient(135deg, #8b5cf6, #6c63ff)",
  "linear-gradient(135deg, #06b6d4, #3b82f6)",
  "linear-gradient(135deg, #a855f7, #6c63ff)",
];

function gradientFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function WorkspaceLobby({ user, onEnter, theme, onToggleTheme }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [joiningInvite, setJoiningInvite] = useState(false);

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  async function loadWorkspaces() {
    const { data } = await supabase
      .from("workspace_members")
      .select("workspaces(id, name, invite_code)")
      .eq("user_id", user.id);

    if (data) {
      setWorkspaces(
        (data as any[]).map((row) => row.workspaces).filter(Boolean) as Workspace[]
      );
    }
    setLoading(false);
  }

  async function handleInvite(code: string) {
    setJoiningInvite(true);
    const { data: ws, error } = await supabase
      .from("workspaces")
      .select("id, name, invite_code")
      .eq("invite_code", code)
      .single();

    if (error || !ws) {
      setInviteError("Invite link is invalid or has expired.");
      setJoiningInvite(false);
      loadWorkspaces();
      return;
    }

    await supabase
      .from("workspace_members")
      .upsert({ workspace_id: ws.id, user_id: user.id }, { onConflict: "workspace_id,user_id" });

    window.history.replaceState({}, "", window.location.pathname);
    onEnter({ id: ws.id, name: ws.name });
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get("invite");
    if (inviteCode) handleInvite(inviteCode);
    else loadWorkspaces();
  }, []);

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);

    const { data: ws, error } = await supabase
      .from("workspaces")
      .insert({ name: newName.trim(), owner_id: user.id })
      .select()
      .single();

    if (error || !ws) { setCreating(false); return; }

    await supabase
      .from("workspace_members")
      .insert({ workspace_id: ws.id, user_id: user.id });

    onEnter({ id: ws.id, name: ws.name });
  }

  async function copyInviteLink(ws: Workspace, e: React.MouseEvent) {
    e.stopPropagation();
    await navigator.clipboard.writeText(`${window.location.origin}/?invite=${ws.invite_code}`);
    setCopied(ws.id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (joiningInvite) {
    return <div className="status-screen"><p>Joining workspace…</p></div>;
  }

  return (
    <div className="lobby-screen">
      {/* Ambient background orbs */}
      <div className="lobby-orbs" aria-hidden="true">
        <div className="lobby-orb lobby-orb--1" />
        <div className="lobby-orb lobby-orb--2" />
        <div className="lobby-orb lobby-orb--3" />
      </div>

      {/* Nav */}
      <nav className="lobby-nav">
        <div className="lobby-nav-brand">
          <span className="lobby-nav-icon">🏢</span>
          <span className="lobby-nav-title">Lifescale Office</span>
        </div>
        <div className="lobby-nav-right">
          <button className="theme-toggle theme-toggle--sm" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <div className="lobby-user">
            {avatarUrl ? (
              <img src={avatarUrl} className="lobby-avatar-img" alt={displayName} />
            ) : (
              <div className="lobby-avatar-fallback">{displayName[0]?.toUpperCase()}</div>
            )}
            <span className="lobby-user-name">{displayName}</span>
          </div>
          <button className="btn-signout" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </nav>

      <div className="lobby-body">
        {/* Hero row */}
        <div className="lobby-hero-row">
          <div>
            <p className="lobby-greeting-line">{greeting()}, <span className="lobby-greeting-name">{displayName}</span> 👋</p>
            <h1 className="lobby-title">Your <span className="lobby-title-grad">Offices</span></h1>
            <p className="lobby-subtitle">Enter a workspace or create a new one and invite your team.</p>
          </div>
          <button className="btn-new-office" onClick={() => setShowCreate(true)}>
            + New Office
          </button>
        </div>

        {inviteError && <p className="lobby-error">{inviteError}</p>}

        {/* Cards */}
        {loading ? (
          <div className="lobby-loading">
            <span className="btn-spinner" style={{ borderTopColor: "var(--accent)" }} />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="lobby-empty-state">
            <div className="lobby-empty-icon">🏢</div>
            <p className="lobby-empty-title">No offices yet</p>
            <p className="lobby-empty-sub">Create one below or open an invite link from a teammate.</p>
            <button className="btn-new-office" onClick={() => setShowCreate(true)}>
              + Create your first office
            </button>
          </div>
        ) : (
          <div className="workspace-grid">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className="ws-card"
                onClick={() => onEnter({ id: ws.id, name: ws.name })}
              >
                <div
                  className="ws-card-icon"
                  style={{ background: gradientFor(ws.name) }}
                >
                  {initials(ws.name)}
                </div>
                <div className="ws-card-body">
                  <span className="ws-card-name">{ws.name}</span>
                  <span className="ws-card-meta">Click to enter</span>
                </div>
                <button
                  className="ws-card-invite"
                  onClick={(e) => copyInviteLink(ws, e)}
                  title="Copy invite link"
                >
                  {copied === ws.id ? "✓" : "🔗"}
                </button>
              </div>
            ))}

            {/* Create card */}
            <div className="ws-card ws-card--new" onClick={() => setShowCreate(true)}>
              <div className="ws-card-new-icon">+</div>
              <span className="ws-card-new-label">New Office</span>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={createWorkspace}>
            <h3>Create new office</h3>
            <p className="modal-hint">You'll get a shareable invite link right after.</p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Lifescale Team"
              required
            />
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-confirm" disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

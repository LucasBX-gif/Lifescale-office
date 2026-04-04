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
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "there";

  async function loadWorkspaces() {
    const { data } = await supabase
      .from("workspace_members")
      .select("workspaces(id, name, invite_code)")
      .eq("user_id", user.id);

    if (data) {
      setWorkspaces(
        (data as any[])
          .map((row) => row.workspaces)
          .filter(Boolean) as Workspace[]
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
      .upsert(
        { workspace_id: ws.id, user_id: user.id },
        { onConflict: "workspace_id,user_id" }
      );

    // Remove invite param from URL so refresh doesn't re-trigger
    window.history.replaceState({}, "", window.location.pathname);

    onEnter({ id: ws.id, name: ws.name });
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get("invite");
    if (inviteCode) {
      handleInvite(inviteCode);
    } else {
      loadWorkspaces();
    }
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

    if (error || !ws) {
      setCreating(false);
      return;
    }

    await supabase
      .from("workspace_members")
      .insert({ workspace_id: ws.id, user_id: user.id });

    // Enter the newly created workspace immediately
    onEnter({ id: ws.id, name: ws.name });
  }

  async function copyInviteLink(ws: Workspace) {
    const link = `${window.location.origin}/?invite=${ws.invite_code}`;
    await navigator.clipboard.writeText(link);
    setCopied(ws.id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (joiningInvite) {
    return (
      <div className="status-screen">
        <p>Joining workspace…</p>
      </div>
    );
  }

  return (
    <div className="lobby-screen">
      <div className="lobby-container">
        <header className="lobby-header">
          <div>
            <h1>Lifescale Office</h1>
            <p className="lobby-greeting">Hey, {displayName}</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button className="btn-signout" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
        </header>

        {inviteError && <p className="lobby-error">{inviteError}</p>}

        <div className="lobby-section-header">
          <h2>Your Offices</h2>
          <button className="btn-create" onClick={() => setShowCreate(true)}>
            + New Office
          </button>
        </div>

        {loading ? (
          <p className="lobby-empty">Loading…</p>
        ) : workspaces.length === 0 ? (
          <p className="lobby-empty">
            No offices yet. Create one or ask a teammate to share their invite link.
          </p>
        ) : (
          <ul className="workspace-list">
            {workspaces.map((ws) => (
              <li key={ws.id} className="workspace-item">
                <div className="workspace-info">
                  <span className="workspace-icon">🏢</span>
                  <span className="workspace-name">{ws.name}</span>
                </div>
                <div className="workspace-actions">
                  <button
                    className="btn-invite"
                    onClick={() => copyInviteLink(ws)}
                  >
                    {copied === ws.id ? "Copied!" : "Copy invite link"}
                  </button>
                  <button
                    className="btn-enter"
                    onClick={() => onEnter({ id: ws.id, name: ws.name })}
                  >
                    Enter →
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={createWorkspace}
          >
            <h3>Create new office</h3>
            <p className="modal-hint">
              You'll get a shareable invite link after creation.
            </p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Lifescale Team"
              required
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowCreate(false)}
              >
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

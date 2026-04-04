import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { WorkspaceLobby } from "./pages/WorkspaceLobby";
import { OfficeApp } from "./OfficeApp";

interface Workspace {
  id: string;
  name: string;
}

export default function App() {
  const { session, user, loading } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  if (loading) {
    return <div className="status-screen"><p>Loading…</p></div>;
  }

  if (!session || !user) {
    return <LoginPage />;
  }

  if (!workspace) {
    return <WorkspaceLobby user={user} onEnter={setWorkspace} />;
  }

  // Use first name only as the in-office display name
  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "User";

  return (
    <OfficeApp
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      userName={displayName}
      onLeave={() => setWorkspace(null)}
    />
  );
}

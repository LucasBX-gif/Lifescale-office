import { useState, useEffect } from "react";
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
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  if (loading) {
    return <div className="status-screen"><p>Loading…</p></div>;
  }

  if (!session || !user) {
    return <LoginPage theme={theme} onToggleTheme={toggleTheme} />;
  }

  if (!workspace) {
    return <WorkspaceLobby user={user} onEnter={setWorkspace} theme={theme} onToggleTheme={toggleTheme} />;
  }

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
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}

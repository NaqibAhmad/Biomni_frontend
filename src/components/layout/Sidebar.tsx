import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Wrench,
  Database,
  Settings,
  Dna,
  LogOut,
  User,
  BookMarked,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and quick actions",
  },
  {
    name: "Chat",
    href: "/chat",
    icon: MessageSquare,
    description: "Interactive AI research assistant",
  },
  {
    name: "Tools",
    href: "/tools",
    icon: Wrench,
    description: "Biomedical analysis tools",
  },
  {
    name: "Data Lake",
    href: "/data",
    icon: Database,
    description: "Biological datasets and resources",
  },
  {
    name: "Prompt Library",
    href: "/prompts",
    icon: BookMarked,
    description: "Manage prompt templates",
  },
  {
    name: "Configuration",
    href: "/configuration",
    icon: Settings,
    description: "Agent and system settings",
  },
];

export function Sidebar() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
            <Dna className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">MyBioAI</h1>
            <p className="text-xs text-gray-500">AI Research Assistant</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Main Navigation
          </h3>
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors group",
                      isActive
                        ? "bg-primary-50 text-primary-700 border-r-2 border-primary-500"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    )
                  }
                  title={item.description}
                >
                  <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer - User Profile & Logout */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* User Info */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate">
              {user?.email || "Loading..."}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>Sign Out</span>
        </button>

        {/* Version */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
          <span>v1.0.0</span>
          <span>MyBioAI</span>
        </div>
      </div>
    </div>
  );
}

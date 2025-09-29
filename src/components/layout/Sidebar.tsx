import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Wrench,
  Database,
  Settings,
  FileText,
  History,
  FlaskConical,
  Dna,
  Microscope,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    name: "Configuration",
    href: "/configuration",
    icon: Settings,
    description: "Agent and system settings",
  },
  {
    name: "Sessions",
    href: "/sessions",
    icon: History,
    description: "Research session history",
  },
];

const toolCategories = [
  {
    name: "Molecular Biology",
    icon: Dna,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    name: "Genomics",
    icon: Activity,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    name: "Cell Biology",
    icon: Microscope,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    name: "Biochemistry",
    icon: FlaskConical,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
];

export function Sidebar() {
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

        {/* Tool Categories */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Tool Categories
          </h3>
          <div className="space-y-2">
            {toolCategories.map((category) => (
              <div
                key={category.name}
                className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center mr-3",
                    category.bgColor
                  )}
                >
                  <category.icon className={cn("w-4 h-4", category.color)} />
                </div>
                <span className="text-gray-700 truncate">{category.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Quick Actions
          </h3>
          <div className="space-y-1">
            <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <FileText className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="truncate">New Session</span>
            </button>
            <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <Database className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="truncate">Add Data</span>
            </button>
            <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <Wrench className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="truncate">Add Tool</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>v1.0.0</span>
          <span>MyBioAI</span>
        </div>
      </div>
    </div>
  );
}

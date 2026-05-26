import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, Settings, LogOut, Menu, X, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/admin',        label: 'Dashboard',          icon: LayoutDashboard, exact: true },
  { to: '/admin/leads',  label: 'Leads e Abordagem',   icon: Users },
  { to: '/admin/conhecimento', label: 'Base de Conhecimento', icon: BookOpen },
  { to: '/admin/configuracoes', label: 'Configurações',  icon: Settings },
];

export const AdminLayout = () => {
  const { user, sair } = useAuth();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  const handleSair = async () => {
    await sair();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#080f1a] flex">
      {/* Overlay mobile */}
      {menuAberto && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0a1420] border-r border-[#9C7C4C]/15 flex flex-col transition-transform duration-300 md:translate-x-0 ${menuAberto ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-[#9C7C4C]/15">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-[#9C7C4C]" />
            <div>
              <p className="font-display text-white font-bold text-sm leading-none">Antonio Dias</p>
              <p className="text-[#9C7C4C] text-xs mt-0.5">Painel Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setMenuAberto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#9C7C4C]/20 text-[#9C7C4C] border border-[#9C7C4C]/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[#9C7C4C]/15">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSair}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteudo principal */}
      <div className="flex-1 flex flex-col md:ml-64 min-w-0">
        {/* Header mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0a1420] border-b border-[#9C7C4C]/15 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#9C7C4C]" />
            <span className="text-white font-semibold text-sm">Admin</span>
          </div>
          <button
            onClick={() => setMenuAberto(true)}
            className="p-2 text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Pagina */}
        <main className="flex-1 overflow-auto flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { session, carregando } = useAuth();
  const navigate = useNavigate();

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#080f1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#9C7C4C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    navigate('/admin/login', { replace: true });
    return null;
  }

  return <>{children}</>;
};

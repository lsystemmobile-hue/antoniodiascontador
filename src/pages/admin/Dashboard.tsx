import { useEffect, useState } from 'react';
import { Users, MessageSquare, CheckCircle, Clock, TimerReset } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLeadStatusBucket, getLeadStatusMeta } from './leadStatus';

interface Stats {
  active: number;
  new: number;
  total: number;
  waiting: number;
  won: number;
}

interface LeadRecente {
  id: string;
  nome: string;
  contato: string;
  assunto: string;
  status: string;
  criado_em: string;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ active: 0, new: 0, total: 0, waiting: 0, won: 0 });
  const [recentes, setRecentes] = useState<LeadRecente[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, nome, contato, assunto, status, criado_em')
        .order('criado_em', { ascending: false });

      if (leads) {
        const bucketCounts = leads.reduce(
          (acc, lead) => {
            const bucket = getLeadStatusBucket(lead.status);
            acc[bucket] += 1;
            return acc;
          },
          { active: 0, new: 0, waiting: 0, won: 0 },
        );

        setStats({
          active: bucketCounts.active,
          new: bucketCounts.new,
          total: leads.length,
          waiting: bucketCounts.waiting,
          won: bucketCounts.won,
        });
        setRecentes(leads.slice(0, 8));
      }
      setCarregando(false);
    };

    carregar();
  }, []);

  const cards = [
    { label: 'Total de Leads', value: stats.total, icon: Users, color: 'text-[#9C7C4C]', bg: 'bg-[#9C7C4C]/10' },
    { label: 'Novos e Qualificacao', value: stats.new, icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Em Abordagem', value: stats.active, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Aguardando Retorno', value: stats.waiting, icon: TimerReset, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Fechados', value: stats.won, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Visão geral dos seus leads e conversas</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#0a1420] border border-[#9C7C4C]/15 rounded-2xl p-5">
            <div className={`inline-flex items-center justify-center w-10 h-10 ${bg} rounded-xl mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">
              {carregando ? <span className="inline-block w-8 h-6 bg-white/10 rounded animate-pulse" /> : value}
            </p>
            <p className="text-gray-400 text-sm mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Leads recentes */}
      <div className="bg-[#0a1420] border border-[#9C7C4C]/15 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#9C7C4C]/15">
          <h2 className="text-white font-semibold">Leads Recentes</h2>
        </div>

        {carregando ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum lead ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-[#9C7C4C]/10">
            {recentes.map(lead => (
              <div key={lead.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-9 h-9 bg-[#9C7C4C]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[#9C7C4C] text-sm font-semibold">
                    {lead.nome?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{lead.nome}</p>
                  <p className="text-gray-500 text-xs truncate">{lead.assunto}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${getLeadStatusMeta(lead.status).className}`}>
                  {getLeadStatusMeta(lead.status).label}
                </span>
                <span className="text-gray-600 text-xs flex-shrink-0 hidden sm:block">
                  {new Date(lead.criado_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

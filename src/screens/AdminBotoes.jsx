import { useNavigate } from 'react-router-dom';

export default function AdminBotoes() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 relative z-10">
      
      {/* Botão 1: Gestão de Clientes */}
      <button 
        onClick={() => navigate('/admin/credito')} 
        className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col items-center gap-2 group shadow-lg"
      >
        <span className="text-2xl group-hover:scale-110 transition-transform">💰</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Gestão de Clientes</span>
      </button>

      {/* Botão 2: Parâmetros/Valores */}
      <button 
        onClick={() => navigate('/admin/valores')} 
        className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-orange-500/50 transition-all flex flex-col items-center gap-2 group shadow-lg"
      >
        <span className="text-2xl group-hover:scale-110 transition-transform">⚙️</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Parâmetros/Valores</span>
      </button>

      {/* Botão 3: Gerenciar Pedidos */}
      <button 
        onClick={() => navigate('/admin/pedidos')} 
        className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all flex flex-col items-center gap-2 group shadow-lg"
      >
        <span className="text-2xl group-hover:scale-110 transition-transform">📦</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Gerenciar Pedidos</span>
      </button>

      {/* Botão 4: Gerar Tabela de Preço */}
      <button 
        onClick={() => navigate('/admin/tabela-precos')} 
        className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col items-center gap-2 group shadow-lg"
      >
        <span className="text-2xl group-hover:scale-110 transition-transform">📋</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Tabela de Preços</span>
      </button>

      {/* NOVO BOTÃO: Gerenciar Saques */}
      <button 
        onClick={() => navigate('/admin/saques')} 
        className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-emerald-400/50 transition-all flex flex-col items-center gap-2 group shadow-lg"
      >
        <span className="text-2xl group-hover:scale-110 transition-transform">🏦</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Solicitações de Saque (PIX)</span>
      </button>

    </div>
  );
}
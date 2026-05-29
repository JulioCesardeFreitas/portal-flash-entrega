import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Sucesso() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // A InfinitePay envia esses dados na URL após o pagamento
  const receiptUrl = searchParams.get('receipt_url');
  const pedidoId = searchParams.get('order_nsu');

  // A MÁGICA AQUI: Descobre se é uma recarga ou uma corrida normal
  const isRecarga = pedidoId && pedidoId.startsWith('RECARGA_');

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      
      {/* Background Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="relative z-10">
        <div className="bg-emerald-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 animate-in zoom-in duration-500">
          <span className="text-5xl">✅</span>
        </div>
        
        {/* TEXTOS DINÂMICOS */}
        <h1 className="text-3xl font-black uppercase tracking-tight text-emerald-400 mb-3">
          {isRecarga ? "Recarga Concluída!" : "Pagamento Confirmado!"}
        </h1>
        
        <p className="text-slate-400 mb-10 max-w-sm mx-auto text-sm leading-relaxed">
          {isRecarga 
            ? "O seu pagamento foi aprovado e o saldo já está disponível na sua Flash Carteira." 
            : "Tudo certo! O seu pedido já foi liberado e os nossos motoristas foram notificados."}
        </p>

        {/* BOTÕES DINÂMICOS */}
        <div className="space-y-4 w-full max-w-xs mx-auto">
          
          {receiptUrl && (
            <a 
              href={receiptUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition-colors text-sm"
            >
              <span>📄</span> Ver Comprovante
            </a>
          )}
          
          {isRecarga ? (
            <button 
              onClick={() => navigate('/carteira')} 
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-xl font-black uppercase shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all text-sm"
            >
              <span>💳</span> Ver Minha Carteira
            </button>
          ) : (
            <button 
              onClick={() => navigate('/principal')} 
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 rounded-xl font-black uppercase shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all text-sm"
            >
              <span>📦</span> Acompanhar Entrega
            </button>
          )}
          
        </div>
      </div>
    </div>
  );
}
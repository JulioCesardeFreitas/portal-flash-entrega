import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

export default function AdminGerenciarPedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  // O filtro agora nasce como 'pendente' (Em Aberto) por padrão
  const [filtro, setFiltro] = useState('pendente'); 

  // === ESTADOS DOS MODAIS ===
  const [modalExclusao, setModalExclusao] = useState({ aberto: false, pedido: null });
  const [modalFeedback, setModalFeedback] = useState({ aberto: false, tipo: '', mensagem: '' });
  const [excluindo, setExcluindo] = useState(false);

  // === BUSCAR PEDIDOS EM TEMPO REAL ===
  useEffect(() => {
    const q = query(collection(db, "pedidos"), orderBy("data", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaPedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPedidos(listaPedidos);
      setCarregando(false);
    }, (error) => {
      console.error("Erro ao buscar pedidos:", error);
      mostrarAviso('erro', 'Erro ao conectar com o servidor.');
      setCarregando(false);
    });

    return () => unsubscribe();
  }, []);

  function mostrarAviso(tipo, msg) {
    setModalFeedback({ aberto: true, tipo: tipo, mensagem: msg });
  }

  // === FUNÇÃO PARA EXCLUIR PEDIDO ===
  async function confirmarExclusao() {
    if (!modalExclusao.pedido) return;
    setExcluindo(true);
    try {
      await deleteDoc(doc(db, "pedidos", modalExclusao.pedido.id));
      setModalExclusao({ aberto: false, pedido: null });
      mostrarAviso('sucesso', 'Pedido excluído com sucesso!');
    } catch (error) {
      console.error("Erro ao excluir:", error);
      mostrarAviso('erro', 'Falha ao excluir o pedido.');
    } finally {
      setExcluindo(false);
    }
  }

  // === APLICA O FILTRO NA LISTA ===
  const pedidosFiltrados = pedidos.filter(pedido => {
    if (filtro === 'todas') return true;
    if (filtro === 'pendente') return pedido.status === 'pendente' || pedido.status === 'aguardando_pagamento';
    return pedido.status === filtro;
  });

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-blue-500 font-bold">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mb-4"></div>
        <span>Carregando Radar de Pedidos...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans relative overflow-hidden">
      
      {/* Background Dinâmico */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-500/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        
        {/* === CABEÇALHO === */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-800/50 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-2xl">📦</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Gerenciar <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Pedidos</span>
              </h1>
              <p className="text-slate-400 text-sm">Monitoramento e controle de tráfego</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/admin')} 
            className="bg-slate-900 border border-slate-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 hover:text-white transition-all shadow-lg flex items-center gap-2"
          >
            Voltar
          </button>
        </header>

        {/* === NOVO FILTRO (MENU DROPDOWN) === */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <label htmlFor="filtroStatus" className="text-slate-400 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap">
            Filtrar por Status:
          </label>
          <div className="relative w-full sm:w-auto">
            <select 
              id="filtroStatus"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="appearance-none w-full sm:w-64 bg-slate-950 border border-slate-700 text-white py-3 pl-4 pr-10 rounded-xl font-bold text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-lg cursor-pointer"
            >
              <option value="pendente">⏳ Em Aberto (Não Iniciadas)</option>
              <option value="em_transito">🏍️ Em Trânsito</option>
              <option value="concluido">✅ Concluídas</option>
              <option value="todas">📑 Todas as Corridas</option>
            </select>
            {/* Ícone da setinha do select */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* === LISTA DE PEDIDOS === */}
        <div className="space-y-4">
          {pedidosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-800 border-dashed text-slate-500 animate-in fade-in">
              <span className="text-5xl mb-4">📭</span>
              <p className="font-medium">Nenhum pedido encontrado neste filtro.</p>
            </div>
          ) : (
            pedidosFiltrados.map((pedido) => (
              <div key={pedido.id} className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col lg:flex-row justify-between gap-6 hover:border-slate-700 transition-colors relative overflow-hidden group animate-in slide-in-from-bottom-2 fade-in">
                
                {/* Linha Lateral de Status */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  pedido.status === 'pendente' || pedido.status === 'aguardando_pagamento' ? 'bg-orange-500' : 
                  pedido.status === 'em_transito' ? 'bg-blue-500' : 'bg-emerald-500'
                }`}></div>

                {/* INFO PRINCIPAL */}
                <div className="flex-1 pl-3 flex flex-col justify-between">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                        pedido.status === 'pendente' || pedido.status === 'aguardando_pagamento' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                        pedido.status === 'em_transito' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {pedido.status.replace('_', ' ')}
                      </span>
                      <span className="text-slate-500 text-xs font-medium">
                        {pedido.data?.toDate ? pedido.data.toDate().toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'}) : '---'}
                      </span>
                    </div>
                    <span className="text-slate-600 text-[10px] font-mono tracking-widest uppercase">ID: {pedido.id}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Cliente</p>
                      <p className="text-sm font-bold text-white flex items-center gap-2">👤 {pedido.nome_cliente || "Não informado"}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Cod: </p>
                      <p className="text-sm font-bold text-blue-400 flex items-center gap-2">{pedido.codigo_confirmacao}</p>
                    </div>
                    {pedido.nome_entregador && (
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Motorista</p>
                        <p className="text-sm font-bold text-blue-400 flex items-center gap-2">🏍️ {pedido.nome_entregador}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 text-sm text-slate-300">
                    <p className="truncate"><span className="text-orange-400 font-bold">A:</span> {pedido.endereco_coleta}</p>
                    <div className="w-px h-3 bg-slate-800 ml-1.5 my-1"></div>
                    <p className="truncate"><span className="text-emerald-400 font-bold">B:</span> {pedido.endereco_entrega}</p>
                  </div>
                </div>

                {/* BLOCO FINANCEIRO E AÇÕES */}
                <div className="flex flex-col justify-between items-end border-t lg:border-t-0 lg:border-l border-slate-800 pt-6 lg:pt-0 lg:pl-6 min-w-[200px] gap-4">
                  <div className="text-right w-full">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Valor / Distância</p>
                    <p className="text-3xl font-black text-white mb-1">R$ {pedido.valor?.toFixed(2).replace('.', ',')}</p>
                    <p className="text-xs text-slate-400 font-medium">{pedido.distancia_km} KM • {pedido.metodo_pagamento?.replace('_', ' ')}</p>
                  </div>

                  {/* BOTÃO DE EXCLUIR: Só aparece se não estiver concluído */}
                  {pedido.status !== 'concluido' ? (
                    <button 
                      onClick={() => setModalExclusao({ aberto: true, pedido: pedido })}
                      className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 py-3 px-6 rounded-xl font-bold uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      <span>🗑️</span> Excluir Pedido
                    </button>
                  ) : (
                    <div className="w-full text-center bg-slate-800/50 text-slate-500 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest border border-slate-700/50 cursor-not-allowed">
                      Finalizado
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* === MODAL DE EXCLUSÃO === */}
      {modalExclusao.aberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-rose-600"></div>
            <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 text-4xl shadow-inner">🗑️</div>
            <h3 className="text-2xl font-bold text-white mb-2">Excluir Pedido?</h3>
            <p className="text-slate-400 text-sm mb-6">Tem a certeza? Esta ação apagará o pedido permanentemente do sistema.</p>
            
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-8 text-left">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">ID do Pedido</p>
              <p className="text-xs font-mono text-slate-300">{modalExclusao.pedido?.id}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmarExclusao} 
                disabled={excluindo}
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-red-500/25 active:scale-95 transition-all disabled:opacity-50"
              >
                {excluindo ? "Excluindo..." : "Sim, Excluir Pedido"}
              </button>
              <button 
                onClick={() => setModalExclusao({ aberto: false, pedido: null })} 
                disabled={excluindo}
                className="w-full text-slate-500 font-bold py-3 hover:text-white transition-colors text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL DE FEEDBACK === */}
      {modalFeedback.aberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className={`bg-slate-900 border w-full max-w-sm rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-300 ${modalFeedback.tipo === 'sucesso' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 text-4xl ${modalFeedback.tipo === 'sucesso' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {modalFeedback.tipo === 'sucesso' ? '✅' : '❌'}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{modalFeedback.tipo === 'sucesso' ? 'Sucesso!' : 'Atenção'}</h3>
            <p className="text-slate-400 text-sm mb-8">{modalFeedback.mensagem}</p>
            <button onClick={() => setModalFeedback({ aberto: false, tipo: '', mensagem: '' })} className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg active:scale-95 transition-all text-white ${modalFeedback.tipo === 'sucesso' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25' : 'bg-red-500 hover:bg-red-600 shadow-red-500/25'}`}>Entendido</button>
          </div>
        </div>
      )}

    </div>
  );
}
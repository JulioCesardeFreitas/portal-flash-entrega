import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import AdminBotoes from './AdminBotoes';

export default function Admin() {
  const [pedidos, setPedidos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [ordenacao, setOrdenacao] = useState('nome');
  const [filtroMotorista, setFiltroMotorista] = useState('todos');

  // === ESTADOS DOS MODAIS ===
  const [modalValoresAberto, setModalValoresAberto] = useState(false);
  const [modalFeedback, setModalFeedback] = useState({ aberto: false, tipo: '', mensagem: '' });
  const [modalDocsAberto, setModalDocsAberto] = useState(false);
  const [motoristaSelecionado, setMotoristaSelecionado] = useState(null);
  
  const [configValores, setConfigValores] = useState({
    taxaMinima: 0,
    kmMinimo: 0,
    valorKmAdicional: 0
  });

  useEffect(() => {
    fetchDadosGerais();
    fetchConfiguracoes();
  }, []);

  // Função centralizada para avisos
  function mostrarAviso(tipo, msg) {
    setModalFeedback({ aberto: true, tipo: tipo, mensagem: msg });
  }

  // Função para abrir o modal de documentos
  function abrirModalDocs(motorista) {
    setMotoristaSelecionado(motorista);
    setModalDocsAberto(true);
  }

  async function fetchDadosGerais() {
    setLoading(true);
    try {
      const qPedidos = query(collection(db, "pedidos"), orderBy("data", "desc"));
      const snapPedidos = await getDocs(qPedidos);
      setPedidos(snapPedidos.docs.map(d => ({ id: d.id, ...d.data() })));

      const qUsers = query(collection(db, "usuarios"), orderBy("nome", "asc"));
      const snapUsers = await getDocs(qUsers);
      setUsuarios(snapUsers.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      mostrarAviso('erro', 'Falha ao carregar dados do servidor.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchConfiguracoes() {
    try {
      const docRef = doc(db, "configuracoes", "valores_corrida");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setConfigValores(docSnap.data());
      }
    } catch (e) {
      console.error("Erro ao buscar configurações:", e);
    }
  }

  async function alternarStatusMotorista(id, statusAtual) {
    try {
      const userRef = doc(db, "usuarios", id);
      await updateDoc(userRef, { aprovado: !statusAtual });
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, aprovado: !statusAtual } : u));
      mostrarAviso('sucesso', `Status do motorista alterado para ${!statusAtual ? 'APROVADO' : 'BLOQUEADO'}.`);
      
      // Se aprovou por dentro do modal, podemos fechá-lo
      if (modalDocsAberto) {
        setModalDocsAberto(false);
      }
    } catch (e) {
      mostrarAviso('erro', 'Erro ao atualizar status do motorista.');
    }
  }

  const faturamentoTotal = pedidos.reduce((acc, p) => acc + (p.valor || 0), 0);
  const totalClientes = usuarios.filter(u => u.tipo === 'cliente').length; // Trouxe pra cá
  const totalEntregadores = usuarios.filter(u => u.tipo === 'entregador').length;
  const motoristasAtivos = usuarios.filter(u => u.tipo === 'entregador' && u.aprovado).length;
  const motoristasPendentes = totalEntregadores - motoristasAtivos;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-orange-500 font-bold font-sans">
        <svg className="animate-spin h-10 w-10 text-orange-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <span>Carregando Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans relative overflow-hidden">
      
      {/* Background Dinâmico */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-800/50 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-lg">
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Painel <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Admin</span>
              </h1>
              <p className="text-slate-400 text-sm">Controle total da plataforma</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/principal')} 
            className="bg-slate-900 border border-slate-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 hover:text-white transition-all shadow-lg flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
            Voltar
          </button>
        </header>

        {/* COMPONENTE DE BOTÕES */}
        <AdminBotoes />

        {/* CARDS DE MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-emerald-500/20 shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">💰</div>
              <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Faturamento Bruto</p>
            </div>
            <p className="text-3xl md:text-4xl font-black text-white mt-4">
              <span className="text-emerald-500 text-xl mr-1">R$</span>
              {faturamentoTotal.toFixed(2).replace('.', ',')}
            </p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-orange-500/20 shadow-xl relative overflow-hidden group hover:border-orange-500/50 transition-all duration-300">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">📦</div>
              <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Total de Pedidos</p>
            </div>
            <p className="text-3xl md:text-4xl font-black text-white mt-4">{pedidos.length}</p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-blue-500/20 shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">🏍️</div>
              <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Motoristas Ativos</p>
            </div>
            <p className="text-3xl md:text-4xl font-black text-white mt-4">
              {motoristasAtivos} <span className="text-sm font-medium text-slate-500">de {totalEntregadores}</span>
            </p>
          </div>
        </div>

        {/* LISTAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <section className="bg-slate-900/50 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-slate-800 flex flex-col h-[700px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="font-bold flex items-center gap-3 text-white text-lg">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-sm">👤</span> 
                Clientes Cadastrados
                {/* NOVO: Contador de Clientes */}
                <span className="bg-blue-500/20 text-white-400 text-[18px] px-2.5 py-1 rounded-md font-black">
                  {totalClientes}
                </span>
              </h2>
              <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
                <button onClick={() => setOrdenacao('nome')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${ordenacao === 'nome' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>A-Z</button>
                <button onClick={() => setOrdenacao('data')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${ordenacao === 'data' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Recentes</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {usuarios.filter(u => u.tipo === 'cliente').sort((a,b) => ordenacao === 'nome' ? (a.nome || "").localeCompare(b.nome || "") : (b.dataCriacao?.seconds || 0) - (a.dataCriacao?.seconds || 0)).map(u => (
                  <div key={u.id} className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 flex justify-between items-center hover:border-blue-500/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold uppercase border border-slate-700">{u.nome?.charAt(0) || '?'}</div>
                      <div>
                        <p className="font-bold text-sm text-white">{u.nome}</p>
                        <p className="text-xs text-blue-400 font-medium mt-0.5">{u.telefone || 'Sem telefone'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-1">Cadastro</p>
                      <p className="text-[11px] text-slate-400">{u.dataCriacao?.toDate ? u.dataCriacao.toDate().toLocaleDateString('pt-BR') : '---'}</p>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          <section className="bg-slate-900/50 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-slate-800 flex flex-col h-[700px]">
            
            {/* CABEÇALHO COM FILTROS E CONTADORES SEPARADOS */}
            <div className="flex flex-col mb-6 gap-4">
              
              {/* Linha 1: Título e Botões Limpos */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="font-bold flex items-center gap-3 text-white text-lg">
                  <span className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center text-sm">🏍️</span> 
                  Gestão de Motoristas
                </h2>
                
                {/* Filtro de Motoristas (Visual Original) */}
                <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner overflow-x-auto">
                  <button 
                    onClick={() => setFiltroMotorista('todos')} 
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filtroMotorista === 'todos' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setFiltroMotorista('aprovados')} 
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filtroMotorista === 'aprovados' ? 'bg-emerald-500/20 text-emerald-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Aprovados
                  </button>
                  <button 
                    onClick={() => setFiltroMotorista('pendentes')} 
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filtroMotorista === 'pendentes' ? 'bg-red-500/20 text-red-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Pendentes
                  </button>
                </div>
              </div>

              {/* Linha 2: Barra de Contadores (Nova) */}
              <div className="flex gap-3 border-t border-slate-800/50 pt-4 overflow-x-auto custom-scrollbar pb-1">
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2 flex gap-3 items-center min-w-max">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Total</span>
                  <span className="font-black text-white text-sm">{totalEntregadores}</span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 flex gap-3 items-center min-w-max">
                  <span className="text-[10px] uppercase font-bold text-emerald-500/70 tracking-widest">AP</span>
                  <span className="font-black text-emerald-400 text-sm">{motoristasAtivos}</span>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 flex gap-3 items-center min-w-max">
                  <span className="text-[10px] uppercase font-bold text-red-500/70 tracking-widest">Pen</span>
                  <span className="font-black text-red-400 text-sm">{motoristasPendentes}</span>
                </div>
              </div>

            </div>

            {/* LISTA DE MOTORISTAS */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {usuarios
                  .filter(u => u.tipo === 'entregador') // 1. Garante que lista apenas os motoristas
                  .filter(u => filtroMotorista === 'aprovados' ? u.aprovado : filtroMotorista === 'pendentes' ? !u.aprovado : true) // 2. Aplica o filtro dos botões
                  .map(u => (
                  <div key={u.id} className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50 flex flex-col gap-4 relative group">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${u.aprovado ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    
                    <div className="flex justify-between items-start pl-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 font-bold uppercase border border-slate-700 shrink-0">{u.nome?.charAt(0) || '?'}</div>
                        <div>
                          <p className="font-bold text-sm text-white">{u.nome}</p>
                          <p className="text-[11px] text-slate-400 mt-1">CPF: {u.cpf || 'Não informado'}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase border ${u.aprovado ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{u.aprovado ? 'Aprovado' : 'Pendente'}</span>
                    </div>

                    {/* Botões do Motorista (Mantidos iguais) */}
                    <div className="flex gap-2 w-full mt-2">
                      <button 
                        onClick={() => abrirModalDocs(u)}
                        className="flex-1 py-3 rounded-xl font-bold text-xs uppercase border bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all"
                      >
                        📄 Ver Docs
                      </button>
                      <button 
                        onClick={() => alternarStatusMotorista(u.id, !!u.aprovado)} 
                        className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase border transition-all ${u.aprovado ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                      >
                        {u.aprovado ? 'Bloquear' : 'Aprovar'}
                      </button>
                    </div>

                  </div>
                ))}
                
                {/* Mensagem caso o filtro não encontre ninguém */}
                {usuarios.filter(u => u.tipo === 'entregador').filter(u => filtroMotorista === 'aprovados' ? u.aprovado : filtroMotorista === 'pendentes' ? !u.aprovado : true).length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    Nenhum motorista encontrado neste filtro.
                  </div>
                )}
            </div>
          </section>
        </div>
      </div>

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

      {/* === MODAL DE DOCUMENTOS === */}
      {modalDocsAberto && motoristaSelecionado && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl p-8 shadow-2xl flex flex-col animate-in zoom-in duration-300">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">
                Documentos: <span className="text-blue-400">{motoristaSelecionado.nome}</span>
              </h3>
              <button 
                onClick={() => setModalDocsAberto(false)}
                className="text-slate-400 hover:text-white text-2xl font-bold transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
              {/* Card da CNH */}
              {/* Card da CNH */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4 text-3xl">
                  🪪
                </div>
                <p className="text-slate-200 font-bold mb-1">Carteira de Motorista</p>
                <p className="text-slate-500 text-xs mb-6">Documento CNH anexado</p>

                {motoristaSelecionado.cnh_url ? (
                  <a 
                    href={motoristaSelecionado.cnh_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    <span>Abrir Visualizador</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                ) : (
                  <div className="w-full py-3 bg-slate-900 border border-dashed border-slate-700 rounded-xl">
                    <p className="text-red-400 text-sm font-medium">Não anexada</p>
                  </div>
                )}
              </div>

              {/* Card do CRV */}
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 mb-4 text-3xl">
                  📄
                </div>
                <p className="text-slate-200 font-bold mb-1">Documento do Veículo</p>
                <p className="text-slate-500 text-xs mb-6">CRV anexado</p>

                {motoristaSelecionado.crv_url ? (
                  <a 
                    href={motoristaSelecionado.crv_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                  >
                    <span>Abrir Visualizador</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                ) : (
                  <div className="w-full py-3 bg-slate-900 border border-dashed border-slate-700 rounded-xl">
                    <p className="text-red-400 text-sm font-medium">Não anexado</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-end gap-4 border-t border-slate-800 pt-6">
              <button 
                onClick={() => setModalDocsAberto(false)} 
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
              >
                Fechar
              </button>
              
              {/* Botão extra para aprovar direto do modal */}
              {!motoristaSelecionado.aprovado && (
                <button 
                  onClick={() => alternarStatusMotorista(motoristaSelecionado.id, !!motoristaSelecionado.aprovado)} 
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                >
                  ✅ Aprovar Motorista
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
import { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, query, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function SolicitacoesResgate() {
  const navigate = useNavigate();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Modais
  const [modalSaqueAberto, setModalSaqueAberto] = useState(false);
  const [saqueSelecionado, setSaqueSelecionado] = useState(null);
  const [comprovanteUrl, setComprovanteUrl] = useState('');
  const [processandoSaque, setProcessandoSaque] = useState(false);
  const [modalFeedback, setModalFeedback] = useState({ aberto: false, tipo: '', mensagem: '' });
  const [arquivo, setArquivo] = useState(null);

  useEffect(() => {
    fetchSaques();
  }, []);

  function mostrarAviso(tipo, msg) {
    setModalFeedback({ aberto: true, tipo: tipo, mensagem: msg });
  }

  async function fetchSaques() {
    setLoading(true);
    try {
      const qSaques = query(collection(db, "solicitacoes_resgate"), orderBy("data_solicitacao", "desc"));
      const snapSaques = await getDocs(qSaques);
      setSolicitacoes(snapSaques.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      mostrarAviso('erro', 'Falha ao carregar as solicitações de resgate.');
    } finally {
      setLoading(false);
    }
  }

  function abrirModalSaque(saque) {
    setSaqueSelecionado(saque);
    setComprovanteUrl(''); // Limpa o input sempre que abrir
    setModalSaqueAberto(true);
  }

  async function handleAprovarSaque(e) {
    e.preventDefault();
    
    // 1. VALIDAÇÃO OBRIGATÓRIA
    if (!arquivo) {
      mostrarAviso('erro', 'Obrigatório: Você precisa selecionar um arquivo de comprovante antes de confirmar.');
      return; // Interrompe a execução aqui
    }

    setProcessandoSaque(true);
    
    try {
      // 2. Upload para o Firebase Storage
      const storageRef = ref(storage, `comprovantes/${saqueSelecionado.id}/${arquivo.name}`);
      const snapshot = await uploadBytes(storageRef, arquivo);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 3. Atualização no Firestore
      const saqueRef = doc(db, 'solicitacoes_resgate', saqueSelecionado.id);
      await updateDoc(saqueRef, {
        status: 'realizado',
        comprovante_url: downloadURL,
        data_pagamento: new Date()
      });

      mostrarAviso('sucesso', 'Comprovante anexado e pagamento confirmado!');
      setModalSaqueAberto(false);
      setArquivo(null); // Limpa o estado após sucesso
    } catch (error) {
      console.error(error);
      mostrarAviso('erro', 'Erro ao enviar o comprovante. Tente novamente.');
    } finally {
      setProcessandoSaque(false);
    }
  }

  const saquesPendentes = solicitacoes.filter(s => s.status === 'pendente');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-emerald-500 font-bold font-sans">
        <svg className="animate-spin h-10 w-10 text-emerald-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <span>Carregando solicitações...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans relative overflow-hidden">
      
      {/* Background Dinâmico */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-800/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-800/50 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 border border-emerald-700 flex items-center justify-center shadow-lg">
              <span className="text-2xl">🏦</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Pagamentos de <span className="text-emerald-400">Motoristas</span>
              </h1>
              <p className="text-slate-400 text-sm">Aprove os saques da carteira digital</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/admin')} 
            className="bg-slate-900 border border-slate-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 hover:text-white transition-all shadow-lg flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
            Voltar ao Admin
          </button>
        </header>

        {/* LISTA DE SOLICITAÇÕES */}
        <section className="bg-slate-900/50 backdrop-blur-md p-6 md:p-8 rounded-3xl border border-slate-800 flex flex-col mb-10 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="font-bold flex items-center gap-3 text-white text-lg">
              Histórico de Solicitações
              {saquesPendentes.length > 0 && (
                <span className="bg-red-500 text-white text-[12px] px-2.5 py-0.5 rounded-full font-black animate-pulse shadow-lg shadow-red-500/50">
                  {saquesPendentes.length} Pendentes
                </span>
              )}
            </h2>
          </div>

          <div className="overflow-x-auto">
            {solicitacoes.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-700 rounded-2xl">
                Nenhuma solicitação de resgate encontrada.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="text-xs uppercase bg-slate-950/50 border-b border-slate-800 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-xl">Data</th>
                    <th className="px-6 py-4">Motorista</th>
                    <th className="px-6 py-4">Chave PIX</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 rounded-tr-xl text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitacoes.map((req) => {
                    const isPendente = req.status === 'pendente';
                    const dataObj = req.data_solicitacao?.toDate ? req.data_solicitacao.toDate() : new Date(req.data_solicitacao);
                    
                    return (
                      <tr key={req.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {dataObj.toLocaleDateString('pt-BR')} <span className="text-[10px] text-slate-500 ml-1">{dataObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-200">{req.nome_motorista || 'Entregador'}</td>
                        <td className="px-6 py-4 font-mono text-emerald-400">{req.chave_pix}</td>
                        <td className="px-6 py-4 font-black text-white">R$ {Number(req.valor).toFixed(2).replace('.', ',')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${isPendente ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isPendente ? (
                            <button 
                              onClick={() => abrirModalSaque(req)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase shadow-lg shadow-emerald-500/20 transition-all"
                            >
                              Pagar via PIX
                            </button>
                          ) : (
                            <a 
                              href={req.comprovante_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase underline underline-offset-4"
                            >
                              Ver Comprovante
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

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

      {/* === MODAL DE PAGAMENTO DE SAQUE === */}
      {modalSaqueAberto && saqueSelecionado && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-8 shadow-2xl flex flex-col animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-emerald-400">💸</span> Confirmar Pagamento
              </h3>
              <button onClick={() => setModalSaqueAberto(false)} className="text-slate-500 hover:text-white text-2xl font-bold transition-colors">&times;</button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6">
              <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Pagar para:</p>
              <p className="text-white font-bold text-lg">{saqueSelecionado.nome_motorista}</p>
              
              <div className="mt-4 flex justify-between items-center border-t border-slate-800 pt-4">
                <div>
                  <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Chave PIX:</p>
                  <p className="text-emerald-400 font-mono font-bold">{saqueSelecionado.chave_pix}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Valor:</p>
                  <p className="text-white font-black text-xl">R$ {Number(saqueSelecionado.valor).toFixed(2).replace('.', ',')}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAprovarSaque} className="flex flex-col gap-4">
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                  Anexar Comprovante (Obrigatório)
                </label>
                <input 
                  type="file" 
                  required // <--- Isso impede que o navegador envie o form se estiver vazio
                  accept="image/*,.pdf"
                  onChange={(e) => setArquivo(e.target.files[0])}
                  className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-700 outline-none focus:border-emerald-500 transition-colors text-sm"
                />
              </div>

              <div className="flex gap-3 mt-4">
                <button 
                  type="button"
                  onClick={() => setModalSaqueAberto(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={processandoSaque}
                  className="flex-1 py-3 rounded-xl font-bold text-xs uppercase bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {processandoSaque ? 'Processando...' : 'Confirmar PIX'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

export default function AdminCredito() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null);
  
  // Estados de Operação de Saldo
  const [valorOperacao, setValorOperacao] = useState('');
  const [processando, setProcessando] = useState(false);
  
  // NOVOS ESTADOS: Configurações do Cliente
  const [isLojista, setIsLojista] = useState(false);
  const [agruparCorridas, setAgruparCorridas] = useState(false);
  const [receberValor, setReceberValor] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  
  const [cobrarAteKm1, setCobrarAteKm1] = useState('');
  const [cobrarAteKm2, setCobrarAteKm2] = useState('');
  const [cobrarAteKm3, setCobrarAteKm3] = useState('');

  const [descAgrup2, setDescAgrup2] = useState('');
  const [descAgrup3, setDescAgrup3] = useState('');
  const [descAgrup4, setDescAgrup4] = useState('');

  const [feedback, setFeedback] = useState({ ativo: false, tipo: '', msg: '' });
  const [listaResultados, setListaResultados] = useState([]);

  // === BUSCAR CONFIGURAÇÕES GLOBAIS ===
  useEffect(() => {
    async function fetchConfig() {
      try {
        const docSnap = await getDoc(doc(db, "configuracoes", "valores_corrida"));
        if (docSnap.exists()) {
          setTaxaMinimaGlobal(parseFloat(docSnap.data().taxaMinima) || 0);
        }
      } catch (error) {
        console.error("Erro ao buscar taxa mínima:", error);
      }
    }
    fetchConfig();
  }, []);

  // Função auxiliar para selecionar o usuário e preencher os dados na tela
  const selecionarUsuario = (u) => {
    setUsuarioEncontrado(u);
    // Preenche os dados de configuração baseados no banco de dados (se existirem)
    setIsLojista(u.lojista || false);
    setAgruparCorridas(u.permiteAgrupar || false);
    setReceberValor(u.permiteReceberValor || false);

    setCobrarAteKm1(u.cobrarAteKm1 || '');
    setCobrarAteKm2(u.cobrarAteKm2 || '');
    setCobrarAteKm3(u.cobrarAteKm3 || '');

    setDescAgrup2(u.descAgrup2 || '');
    setDescAgrup3(u.descAgrup3 || '');
    setDescAgrup4(u.descAgrup4 || '');
    
    setValorOperacao('');
    setFeedback({ ativo: false, tipo: '', msg: '' });
  };

  // === BUSCAR CLIENTE PELO NOME ===
  const buscarCliente = async (e) => {
    e.preventDefault();
    if (!busca) return;
    
    setCarregandoBusca(true);
    setUsuarioEncontrado(null);
    setListaResultados([]);
    setFeedback({ ativo: false, tipo: '', msg: '' });

    try {
      const buscaFormatada = busca.trim();
      const usuariosRef = collection(db, "usuarios");
      
      const q = query(
        usuariosRef, 
        where("nome", ">=", buscaFormatada), 
        where("nome", "<=", buscaFormatada + "\uf8ff")
      );
      
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setFeedback({ ativo: true, tipo: 'erro', msg: 'Nenhum cliente encontrado.' });
      } else {
        const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setListaResultados(docs);
        
        if (docs.length === 1) {
          selecionarUsuario(docs[0]);
        }
      }
    } catch (error) {
      console.error(error);
      setFeedback({ ativo: true, tipo: 'erro', msg: 'Erro na busca.' });
    } finally {
      setCarregandoBusca(false);
    }
  };

  // === INJETAR OU REMOVER SALDO ===
  const realizarOperacao = async (tipoOperacao) => {
    const valorNumerico = parseFloat(valorOperacao.replace(',', '.'));
    
    if (!valorOperacao || isNaN(valorNumerico) || valorNumerico <= 0) {
      setFeedback({ ativo: true, tipo: 'erro', msg: 'Digite um valor válido maior que zero.' });
      return;
    }

    setProcessando(true);
    setFeedback({ ativo: false, tipo: '', msg: '' });

    try {
      const saldoAtual = parseFloat(usuarioEncontrado.saldo_carteira || 0);
      let novoSaldo = 0;

      if (tipoOperacao === 'adicionar') {
        novoSaldo = saldoAtual + valorNumerico;
      } else if (tipoOperacao === 'remover') {
        if (saldoAtual < valorNumerico) {
          setFeedback({ ativo: true, tipo: 'erro', msg: 'O cliente não tem saldo suficiente.' });
          setProcessando(false);
          return;
        }
        novoSaldo = saldoAtual - valorNumerico;
      }

      const userRef = doc(db, "usuarios", usuarioEncontrado.id);
      await updateDoc(userRef, { saldo_carteira: novoSaldo });

      setUsuarioEncontrado({ ...usuarioEncontrado, saldo_carteira: novoSaldo });
      setValorOperacao('');
      setFeedback({ ativo: true, tipo: 'sucesso', msg: `Saldo ${tipoOperacao === 'adicionar' ? 'adicionado' : 'removido'} com sucesso!` });

    } catch (error) {
      setFeedback({ ativo: true, tipo: 'erro', msg: 'Erro ao atualizar o saldo.' });
    } finally {
      setProcessando(false);
    }
  };

  // === SALVAR CONFIGURAÇÕES DO LOJISTA ===
  const salvarConfiguracoes = async () => {
    // 1. Pega o valor do desconto de forma segura
    const d1 = parseFloat(cobrarAteKm1) || 0;
    const d2 = parseFloat(cobrarAteKm2) || 0;
    const d3 = parseFloat(cobrarAteKm3) || 0;

    setSalvandoConfig(true);
    setFeedback({ ativo: false, tipo: '', msg: '' });

    try {
      const userRef = doc(db, "usuarios", usuarioEncontrado.id);
      
      const dadosConfig = {
        lojista: isLojista,
        cobrarAteKm1: isLojista ? d1 : 0,
        cobrarAteKm2: isLojista ? d2 : 0,
        cobrarAteKm3: isLojista ? d3 : 0,
        permiteAgrupar: isLojista ? agruparCorridas : false,
        permiteReceberValor: isLojista ? receberValor : false,
        descAgrup2: isLojista && agruparCorridas ? (parseFloat(descAgrup2) || 0) : 0,
        descAgrup3: isLojista && agruparCorridas ? (parseFloat(descAgrup3) || 0) : 0,
        descAgrup4: isLojista && agruparCorridas ? (parseFloat(descAgrup4) || 0) : 0,
      };

      await updateDoc(userRef, dadosConfig);

      // Atualiza o estado local para refletir na tela imediatamente
      setUsuarioEncontrado({ ...usuarioEncontrado, ...dadosConfig });
      setFeedback({ ativo: true, tipo: 'sucesso', msg: 'Configurações atualizadas com sucesso!' });

    } catch (error) {
      console.error(error);
      setFeedback({ ativo: true, tipo: 'erro', msg: 'Erro ao salvar as configurações.' });
    } finally {
      setSalvandoConfig(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-white pb-10 relative">
      
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
            <span className="text-xl">⚙️</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Gestão de <span className="text-emerald-400">Clientes</span></h1>
        </div>
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors text-sm font-medium border border-slate-800 px-4 py-2 rounded-lg bg-slate-900">
          Voltar
        </button>
      </header>

      <main className="flex-1 p-4 md:p-8 flex flex-col items-center w-full max-w-2xl mx-auto mt-6">
        
        {/* CAIXA DE BUSCA */}
        <div className="w-full bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl mb-6">
          <h2 className="font-bold mb-4 text-slate-300 flex items-center gap-2">
            <span>🔍</span> Buscar Cliente
          </h2>
          <form onSubmit={buscarCliente} className="flex gap-3">
            <input 
              type="text" 
              placeholder="Digite o NOME do cliente..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-emerald-500 transition-all text-sm placeholder:text-slate-600"
            />
            <button 
              type="submit" 
              disabled={carregandoBusca || !busca}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-all"
            >
              {carregandoBusca ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        </div>

        {/* LISTA DE RESULTADOS */}
        {!usuarioEncontrado && listaResultados.length > 1 && (
          <div className="w-full mt-4 space-y-3 max-h-[50vh] overflow-y-auto pr-3 custom-scrollbar animate-in slide-in-from-bottom-2 duration-300">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-3 ml-1 tracking-widest">Selecione o Cliente:</p>
            {listaResultados.map(u => (
              <button
                key={u.id}
                onClick={() => selecionarUsuario(u)}
                className="w-full bg-slate-900 border border-slate-800 p-5 rounded-2xl flex justify-between items-center hover:border-orange-500 hover:bg-slate-900/50 hover:-translate-y-0.5 transition-all group shadow-lg shadow-slate-950/20"
              >
                <div className="text-left flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold uppercase border border-slate-700">
                    {u.nome?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">{u.nome}</p>
                    <p className="text-[11px] text-slate-500 font-medium group-hover:text-slate-400 mt-0.5">{u.email || 'Sem e-mail cadastrado'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* MENSAGEM DE FEEDBACK GERAL */}
        {feedback.ativo && (
          <div className={`w-full p-4 rounded-xl mb-6 border font-medium text-sm flex items-center gap-3 ${
            feedback.tipo === 'sucesso' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <span>{feedback.tipo === 'sucesso' ? '✅' : '⚠️'}</span> {feedback.msg}
          </div>
        )}

        {/* PERFIL DO CLIENTE ENCONTRADO */}
        {usuarioEncontrado && (
          <div className="w-full bg-slate-900/80 p-6 md:p-8 rounded-3xl border border-emerald-500/30 shadow-2xl animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            
            {/* CABEÇALHO DO CLIENTE */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-6">
              <div>
                <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest mb-1">Cliente Localizado</p>
                <h3 className="text-2xl font-bold text-white mb-1">{usuarioEncontrado.nome || 'Sem Nome'}</h3>
                <p className="text-sm text-slate-400">{usuarioEncontrado.email}</p>
                {usuarioEncontrado.cpf && <p className="text-sm text-slate-400 mt-1">CPF: {usuarioEncontrado.cpf}</p>}
              </div>
            </div>

            {/* SESSÃO 1: CARTEIRA VIRTUAL */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-bold flex items-center gap-2"><span className="text-emerald-500">💰</span> Carteira Virtual</h4>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Saldo Atual</p>
                  <p className="text-2xl font-black text-emerald-400">
                    R$ {(parseFloat(usuarioEncontrado.saldo_carteira) || 0).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0,00" 
                    value={valorOperacao}
                    onChange={(e) => setValorOperacao(e.target.value)}
                    className="w-full bg-slate-900 text-white pl-12 pr-4 py-3 rounded-xl border border-slate-700 outline-none focus:border-emerald-500 transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <button 
                    onClick={() => realizarOperacao('remover')}
                    disabled={processando || !valorOperacao}
                    className="w-full bg-slate-800 hover:bg-red-500/20 text-red-400 disabled:opacity-50 py-3 rounded-xl font-bold transition-all border border-slate-700 hover:border-red-500/50 flex justify-center gap-2 text-sm"
                  >
                    Remover Saldo
                  </button>
                  <button 
                    onClick={() => realizarOperacao('adicionar')}
                    disabled={processando || !valorOperacao}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 py-3 rounded-xl font-bold transition-all flex justify-center gap-2 text-sm"
                  >
                    Adicionar Saldo
                  </button>
                </div>
              </div>
            </div>

            {/* SESSÃO 2: CONFIGURAÇÕES DO LOJISTA */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
              <h4 className="text-lg font-bold flex items-center gap-2 mb-6"><span className="text-orange-500">🏪</span> Configurações de Lojista</h4>

              {/* Toggle Lojista */}
              <label className="flex items-center cursor-pointer mb-6 p-4 bg-slate-900 rounded-xl border border-slate-800">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={isLojista} 
                    onChange={(e) => setIsLojista(e.target.checked)} 
                  />
                  <div className={`block w-12 h-7 rounded-full transition-colors ${isLojista ? 'bg-orange-500' : 'bg-slate-700'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${isLojista ? 'transform translate-x-5' : ''}`}></div>
                </div>
                <div className="ml-4">
                  <div className="text-sm font-bold text-white">Este cliente é um Lojista?</div>
                  <div className="text-xs text-slate-500 mt-0.5">Ativa permissões e configurações exclusivas.</div>
                </div>
              </label>

              {/* Campos que dependem do Lojista */}
              <div className={`space-y-4 transition-opacity duration-300 ${isLojista ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">
                    Valores de cobrança até 3 KM:
                  </label>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {/* Campo Até 1KM */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Até 1 KM</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">R$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          value={cobrarAteKm1}
                          onChange={(e) => setCobrarAteKm1(e.target.value)}
                          disabled={!isLojista}
                          className="w-full bg-slate-900 text-white pl-8 pr-2 py-3 rounded-xl border border-slate-700 outline-none focus:border-orange-500 transition-all font-bold text-sm disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Campo Até 2KM */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Até 2 KM</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">R$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          value={cobrarAteKm2}
                          onChange={(e) => setCobrarAteKm2(e.target.value)}
                          disabled={!isLojista}
                          className="w-full bg-slate-900 text-white pl-8 pr-2 py-3 rounded-xl border border-slate-700 outline-none focus:border-orange-500 transition-all font-bold text-sm disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Campo Até 3KM */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Até 3 KM</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">R$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          value={cobrarAteKm3}
                          onChange={(e) => setCobrarAteKm3(e.target.value)}
                          disabled={!isLojista}
                          className="w-full bg-slate-900 text-white pl-8 pr-2 py-3 rounded-xl border border-slate-700 outline-none focus:border-orange-500 transition-all font-bold text-sm disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  <label className="flex items-center cursor-pointer bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <input 
                      type="checkbox" 
                      checked={agruparCorridas}
                      onChange={(e) => setAgruparCorridas(e.target.checked)}
                      disabled={!isLojista}
                      className="w-5 h-5 accent-orange-500 bg-slate-800 border-slate-700 rounded cursor-pointer disabled:opacity-50"
                    />
                    <span className="ml-3 text-sm font-medium text-slate-300">Permite Agrupar Corridas</span>
                  </label>
                  {/* Sub-sessão de Descontos Progressivos */}
                  <div className={`mt-3 ml-8 space-y-3 transition-all duration-300 ${agruparCorridas && isLojista ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">
                      Descontos Progressivos (%)
                    </p>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">2 Pedidos</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            placeholder="0"
                            value={descAgrup2}
                            onChange={(e) => setDescAgrup2(e.target.value)}
                            className="w-full bg-slate-950 text-white pr-7 pl-3 py-2 rounded-lg border border-slate-800 outline-none focus:border-orange-500 text-sm font-bold"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs">%</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">3 Pedidos</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            placeholder="0"
                            value={descAgrup3}
                            onChange={(e) => setDescAgrup3(e.target.value)}
                            className="w-full bg-slate-950 text-white pr-7 pl-3 py-2 rounded-lg border border-slate-800 outline-none focus:border-orange-500 text-sm font-bold"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs">%</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">4 ou +</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            placeholder="0"
                            value={descAgrup4}
                            onChange={(e) => setDescAgrup4(e.target.value)}
                            className="w-full bg-slate-950 text-white pr-7 pl-3 py-2 rounded-lg border border-slate-800 outline-none focus:border-orange-500 text-sm font-bold"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center cursor-pointer bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <input 
                      type="checkbox" 
                      checked={receberValor}
                      onChange={(e) => setReceberValor(e.target.checked)}
                      disabled={!isLojista}
                      className="w-5 h-5 accent-orange-500 bg-slate-800 border-slate-700 rounded cursor-pointer disabled:opacity-50"
                    />
                    <span className="ml-3 text-sm font-medium text-slate-300">Permite Receber Valor do Cliente</span>
                  </label>
                </div>

              </div>

              {/* Botão de Salvar Configurações */}
              <button 
                onClick={salvarConfiguracoes}
                disabled={salvandoConfig}
                className="w-full mt-6 bg-slate-800 hover:bg-orange-600 text-white disabled:opacity-50 py-3.5 rounded-xl font-bold transition-all shadow-lg flex justify-center gap-2 text-sm border border-slate-700 hover:border-orange-500"
              >
                {salvandoConfig ? 'Salvando...' : '💾 Salvar Configurações'}
              </button>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
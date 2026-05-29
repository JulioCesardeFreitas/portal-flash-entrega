import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function Carteira() {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(true);
  const [saldoCliente, setSaldoCliente] = useState(0);
  const [telefoneUser, setTelefoneUser] = useState('');
  const [cpfUser, setCpfUser] = useState('');
  const [historicoUso, setHistoricoUso] = useState([]);
  const [modalRecargaAberto, setModalRecargaAberto] = useState(false);
  const [modalFeedback, setModalFeedback] = useState({ aberto: false, tipo: '', mensagem: '' });

  const [valorRecarga, setValorRecarga] = useState('');
  const [gerandoPix, setGerandoPix] = useState(false);
  

  useEffect(() => {
    async function carregarDadosCarteira() {
      if (!auth.currentUser) return;
      
      try {
        // 1. Busca o Saldo Atual
        const userDocRef = doc(db, "usuarios", auth.currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const dadosUser = docSnap.data();
          if (dadosUser.saldo_carteira) setSaldoCliente(parseFloat(dadosUser.saldo_carteira));
          
          // Salvando os dados para mandar pra InfinitePay depois
          setTelefoneUser(dadosUser.telefone || "");
          setCpfUser(dadosUser.cpf || dadosUser.documento || ""); // Ajuste para o nome do campo de CPF que você usa no banco
        }

        // 2. Busca o Histórico de Uso (Pedidos pagos com 'saldo')
        const q = query(
          collection(db, "pedidos"),
          where("cliente_uid", "==", auth.currentUser.uid),
          where("metodo_pagamento", "==", "saldo"),
          orderBy("data", "desc")
        );
        const querySnapshot = await getDocs(q);
        setHistoricoUso(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Erro ao carregar carteira:", error);
      } finally {
        setCarregando(false);
      }
    }

    carregarDadosCarteira();
  }, []);

  // Função para gerar o Pix da Carteira
  async function gerarPixRecarga() {
    const valorNumerico = parseFloat(valorRecarga.replace(',', '.'));
    
    if (isNaN(valorNumerico) || valorNumerico < 5) {
      mostrarAviso('erro', "O valor mínimo para recarga é de R$ 5,00.");
      return;
    }

    setGerandoPix(true);

    try {
      // 1. Busca os dados completos do usuário no banco (para pegar o endereço)
      const userDocRef = doc(db, "usuarios", auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const dadosUser = userDocSnap.exists() ? userDocSnap.data() : {};

      // 2. Cria o ID da recarga
      const idRecarga = `RECARGA_${auth.currentUser.uid}_${Date.now()}`;
      
      const URL_GERAR_PAGAMENTO = "https://gerarlinkpagamento-cuihbvkkmq-uc.a.run.app";

      // 3. Dispara a requisição com os dados do Perfil
      const response = await fetch(URL_GERAR_PAGAMENTO, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedidoId: idRecarga,
          valor: valorNumerico,
          email: auth.currentUser?.email || dadosUser.email,
          nome: dadosUser.nome || auth.currentUser?.displayName || "Cliente Flash",
          
          // Dados de contato e documento (prioridade alta para o antifraude)
          telefone: dadosUser.telefone || telefoneUser || "",
          document: dadosUser.cpf || dadosUser.documento || cpfUser || "",
          
          // Endereço de Faturamento (Opcional, mas ótimo se tiver)
          cep: dadosUser.cep || "",
          rua: dadosUser.rua || "",        
          bairro: dadosUser.bairro || "",   
          numero: dadosUser.numero || "",   
          complemento: dadosUser.complemento || "",

          descricao: `Recarga Flash Carteira: R$ ${valorNumerico.toFixed(2)}`
        })
      });

      const dadosPagamento = await response.json();

      if (dadosPagamento.url) {
        window.location.href = dadosPagamento.url;
      } else {
        throw new Error("Falha ao gerar o link");
      }
    } catch (error) {
      console.error("Erro recarga:", error);
      mostrarAviso('erro', "Erro ao gerar a cobrança. Tente novamente.");
    } finally {
      setGerandoPix(false);
    }
  }

  const enviarWhatsAppAdmin = (msgCustomizada) => {
    const telefoneAdmin = "5547992231712";
    const linkBase = `https://api.whatsapp.com/send?phone=${telefoneAdmin}&text=${encodeURIComponent(msgCustomizada)}`;
    window.open(linkBase, '_blank');
  };

  function mostrarAviso(tipo, msg) {
    setModalFeedback({ aberto: true, tipo: tipo, mensagem: msg });
  }

  if (carregando) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-500 font-bold">Acessando cofre...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-white pb-10 relative bg-slate-950">
      
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-10 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl transform scale-105"></div>
      </div>

      {/* HEADER */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-xl">💳</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Flash <span className="text-emerald-400">Carteira</span></h1>
        </div>
        <button 
          onClick={() => navigate('/principal')} 
          className="flex items-center gap-2 bg-slate-900 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white transition-all border border-slate-700"
        >
          Voltar
        </button>
      </header>

      <main className="flex-1 p-4 md:p-8 flex flex-col items-center relative z-10 w-full max-w-4xl mx-auto animate-in fade-in duration-500">
        
        {/* CARD DE SALDO */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-700 w-full p-8 rounded-3xl shadow-2xl shadow-emerald-500/20 mb-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-center md:items-start gap-6 border border-emerald-400/30 mt-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="relative z-10 text-center md:text-left">
            <p className="text-emerald-100 font-bold uppercase tracking-widest text-xs mb-2">Saldo Disponível</p>
            <p className="text-4xl md:text-5xl font-black text-white tracking-tight">
              <span className="text-2xl mr-1 text-emerald-200">R$</span>
              {saldoCliente.toFixed(2).replace('.', ',')}
            </p>
          </div>

          <div className="relative z-10 w-full md:w-auto">
            <button 
              onClick={() => setModalRecargaAberto(true)}
              className="w-full md:w-auto bg-white text-emerald-700 px-8 py-4 rounded-xl font-black uppercase text-sm shadow-lg hover:bg-emerald-50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              Adicionar Saldo
            </button>
          </div>
        </div>

        {/* HISTÓRICO DE USO DA CARTEIRA */}
        <div className="w-full">
          <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4 ml-2">Últimas Transações com Saldo</h3>
          <div className="space-y-3">
            {historicoUso.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed text-slate-500">
                <span className="text-3xl mb-3">👻</span>
                <p className="font-medium text-sm">Nenhum pagamento feito com o saldo ainda.</p>
              </div>
            ) : (
              historicoUso.map(pedido => (
                <div key={pedido.id} className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm mb-0.5">Pagamento de Corrida</p>
                      <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">ID: {pedido.id.substring(0,6)} • {pedido.data?.toDate ? pedido.data.toDate().toLocaleDateString('pt-BR') : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-black text-lg">- R$ {(pedido.valor || 0).toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* MODAL DE ADICIONAR SALDO (CARTEIRA AUTOMATIZADA) */}
      {modalRecargaAberto && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
          <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative overflow-hidden animate-in zoom-in duration-300">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold text-xl flex items-center gap-2">
                <span className="text-2xl">💰</span> Recarga Automática
              </h3>
              <button onClick={() => setModalRecargaAberto(false)} className="text-slate-500 hover:text-white text-2xl transition-colors">×</button>
            </div>

            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Digite o valor que deseja adicionar. O saldo ficará disponível na sua Flash Carteira assim que o pagamento for concluído.
            </p>

            {/* Input de Valor */}
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xl">R$</span>
              <input 
                type="number" 
                placeholder="0,00"
                value={valorRecarga}
                onChange={(e) => setValorRecarga(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-2xl font-black text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-700"
              />
            </div>

            <div className="space-y-3">
              <button 
                onClick={gerarPixRecarga}
                disabled={gerandoPix}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-emerald-500/25 active:scale-95 transition-all text-sm flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gerandoPix ? "Gerando Pix..." : (
                  <><span>⚡</span> Gerar Pix para Recarga</>
                )}
              </button>
              
              <button 
                onClick={() => setModalRecargaAberto(false)}
                className="w-full bg-transparent text-slate-500 font-bold py-3 hover:text-white transition-colors text-xs uppercase tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AVISO */}
      {modalFeedback.aberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[300]">
          <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-sm rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-emerald-500/10 text-emerald-500">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-white font-bold text-2xl mb-2">
              {modalFeedback.tipo === 'sucesso' ? 'Copiado!' : 'Atenção'}
            </h2>
            <p className="text-slate-400 text-sm mb-8">{modalFeedback.mensagem}</p>
            <button 
              onClick={() => setModalFeedback({ aberto: false, tipo: '', mensagem: '' })}
              className="w-full text-white py-4 rounded-xl font-bold transition-colors bg-emerald-500 hover:bg-emerald-600"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
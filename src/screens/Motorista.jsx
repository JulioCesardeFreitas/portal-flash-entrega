import { useState, useEffect, useRef} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, auth, messaging } from '../firebase';
import { collection,query,where,onSnapshot,updateDoc,doc,orderBy,getDoc} from 'firebase/firestore';
import { getToken, onMessage } from "firebase/messaging";

export default function Motorista() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState(location.state?.abaInicial || 'todas'); 
  
  // === ESTADOS PARA OS MODAIS ===
  const [modalConfirmacao, setModalConfirmacao] = useState({ aberto: false, pedido: null });
  const [modalAceitar, setModalAceitar] = useState({ aberto: false, pedido: null });
  const [modalFeedback, setModalFeedback] = useState({ aberto: false, tipo: '', mensagem: '' });
  const [codigoInserido, setCodigoInserido] = useState('');
  const [nomeMotorista, setNomeMotorista] = useState('Motorista');
  const [estaAprovado, setEstaAprovado] = useState(true);
  const [alertasAtivados, setAlertasAtivados] = useState(false);
  const [buscandoDados, setBuscandoDados] = useState(true);

  const audioRef = useRef(null); 
  const [alertaNovoPedido, setAlertaNovoPedido] = useState({ aberto: false, pedido: null });

  // === RASTREIO EM TEMPO REAL (CORRETO) ===
  useEffect(() => {
    let watchId = null;

    // 1. Só inicia se o motorista estiver logado e houver pedidos carregados
    if (!auth.currentUser || pedidos.length === 0) return;

    // 2. Procura se existe um pedido "em_transito" que pertence a este motorista
    const pedidoEmAndamento = pedidos.find(p => 
      p.status === 'em_transito' && 
      p.entregador_uid === auth.currentUser.uid
    );

    if (pedidoEmAndamento) {
      console.log("📡 Rastreio Ativo para o pedido:", pedidoEmAndamento.id);
      
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            // Atualiza as coordenadas no documento específico do pedido
            await updateDoc(doc(db, "pedidos", pedidoEmAndamento.id), {
              lat_motorista: latitude,
              lng_motorista: longitude
            });
          } catch (error) {
            console.error("Erro ao atualizar localização no Firebase:", error);
          }
        },
        (err) => {
          console.error("Erro de GPS no Motorista:", err);
        },
        { 
          enableHighAccuracy: true, 
          distanceFilter: 10, // Só envia para o banco se o motorista se mover 10 metros
          maximumAge: 5000 
        }
      );
    }

    return () => {
      if (watchId !== null) {
        console.log("🛑 Rastreio encerrado.");
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [pedidos]); // Re-executa sempre que a lista de pedidos mudar

  useEffect(() => {
    if (location.state?.abaInicial) setFiltro(location.state.abaInicial);
  }, [location.state]);

  const ativarNotificacoes = async () => {
    try {
      const permissao = await Notification.requestPermission();
      if (permissao === 'granted') {
        const token = await getToken(messaging, { 
          vapidKey: "BFlQfZFjIBdWqrYQ-Y3nEoXqO4cR048ia4r-UfFujMrGkWqUKr4Njp0SQNxo-35wE5UtZQxYEooeJUsurHyr85I" 
        });
        if (token && auth.currentUser) {
          await updateDoc(doc(db, "usuarios", auth.currentUser.uid), {
            fcmTokenWeb: token,
            notificacoesAtivas: true
          });
          setAlertasAtivados(true);
          mostrarAviso('sucesso', 'Alertas ativados! O servidor está te inscrevendo nos tópicos.');
        }
      }
    } catch (error) {
      console.error("Erro ao ativar:", error);
      mostrarAviso('erro', 'Falha ao ativar notificações.');
    }
  };

  const alternarAlertas = async () => {
    if (alertasAtivados) {
      try {
        await updateDoc(doc(db, "usuarios", auth.currentUser.uid), { notificacoesAtivas: false });
        setAlertasAtivados(false);
        mostrarAviso('sucesso', 'Alertas silenciados.');
      } catch (e) {
        mostrarAviso('erro', 'Erro ao desativar alertas.');
      }
    } else {
      await ativarNotificacoes();
    }
  };  
  
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Novo pedido recebido via FCM:", payload);
      const audio = new Audio("/sons/alerta.mp3");
      audio.play().catch(() => console.log("Som bloqueado."));
      setModalFeedback({ aberto: true, tipo: 'sucesso', mensagem: `🚀 NOVO PEDIDO: ${payload.notification?.body || "Verifique as entregas disponíveis!"}` });
    });
    return () => unsubscribe();
  }, []);

  function mostrarAviso(tipo, msg) {
    setModalFeedback({ aberto: true, tipo: tipo, mensagem: msg });
  }

  useEffect(() => {
    async function carregarPerfil() {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
        if (userDoc.exists()) {
          const dados = userDoc.data();
          
          // Verifica se o motorista está com cadastro pendente de aprovação
          if (dados.aprovado === false && dados.tipo !== 'admin') {
            mostrarAviso('erro', 'Sua conta ainda está em análise. O acesso aos pedidos será liberado em breve.');
            // Se quiser, pode dar um navigate('/principal') aqui, 
            // mas mostrar o aviso na tela do motorista é mais amigável.
          } else {
            setEstaAprovado(true);
          }

          setNomeMotorista(dados.nome || "Motorista");
          setAlertasAtivados(dados.notificacoesAtivas || false);
        }
      } catch (error) { 
        console.error("Erro ao carregar perfil:", error); 
      } finally {
        setBuscandoDados(false);
      }
    }
    carregarPerfil();
  }, [navigate]);

  useEffect(() => {
    async function buscarNomeMotorista() {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "usuarios", auth.currentUser.uid));
          if (userDoc.exists()) setNomeMotorista(userDoc.data().nome);
        } catch (e) { console.error("Erro ao buscar nome:", e); }
      }
    }
    buscarNomeMotorista();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    setCarregando(true);
    let q;
    const pedidosRef = collection(db, "pedidos");

    if (filtro === 'todas') {
      q = query(pedidosRef, where("status", "==", "pendente"), orderBy("data", "desc"));
    } else if (filtro === 'andamento') {
      q = query(pedidosRef, where("entregador_uid", "==", auth.currentUser.uid), where("status", "==", "em_transito"), orderBy("data", "desc"));
    } else {
      q = query(pedidosRef, where("entregador_uid", "==", auth.currentUser.uid), where("status", "==", "concluido"), orderBy("data", "desc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPedidos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCarregando(false);
    }, (error) => {
      console.error("Erro no ouvinte de lista:", error);
      setCarregando(false);
    });

    return () => unsubscribe();
  }, [filtro, auth.currentUser]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const pedidosRef = collection(db, "pedidos");
    const qVigia = query(pedidosRef, where("status", "==", "pendente"));
    let cargaInicialConcluida = false;

    const unsubscribeVigia = onSnapshot(qVigia, (snapshot) => {
      if (cargaInicialConcluida && alertasAtivados) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const pedidoData = { id: change.doc.id, ...change.doc.data() };

            if (pedidoData.cliente_uid !== auth.currentUser.uid) {
              if (!audioRef.current) {
                audioRef.current = new Audio("/sons/alerta.mp3");
                audioRef.current.loop = true; 
              }
              audioRef.current.play().catch(e => console.log("Aguardando clique..."));
              setAlertaNovoPedido({ aberto: true, pedido: pedidoData });
            }
          }
        });
      }
      cargaInicialConcluida = true;
    });
    return () => unsubscribeVigia();
  }, [auth.currentUser, alertasAtivados]);

  const pararGritoERejeitar = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setAlertaNovoPedido({ aberto: false, pedido: null });
  };

  const aceitarPeloGrito = async () => {
    const pedido = alertaNovoPedido.pedido;
    if (!pedido) return;
    try {
      await updateDoc(doc(db, "pedidos", pedido.id), { status: "em_transito", entregador_uid: auth.currentUser.uid, nome_entregador: nomeMotorista });
      pararGritoERejeitar(); 
      setFiltro('andamento'); 
      mostrarAviso('sucesso', 'Entrega aceita! Clique em "🗺️ Rota GPS" para iniciar.');
    } catch (e) {
      mostrarAviso('erro', 'Alguém aceitou primeiro!');
      pararGritoERejeitar();
    }
  };
  
  function abrirRotaCompleta(origem, destino) {
    const url = `https://www.google.com/maps/dir/?api=1&waypoints=${encodeURIComponent(origem + ", SC")}&destination=${encodeURIComponent(destino + ", SC")}&travelmode=driving`;
    window.open(url, '_blank');
  }

  function confirmarAceite(pedido) { setModalAceitar({ aberto: true, pedido: pedido }); }

  async function executarAceite() {
    const pedido = modalAceitar.pedido;
    try {
      await updateDoc(doc(db, "pedidos", pedido.id), { status: "em_transito", entregador_uid: auth.currentUser.uid, nome_entregador: nomeMotorista });
      setModalAceitar({ aberto: false, pedido: null });
      setFiltro('andamento');
      mostrarAviso('sucesso', 'Entrega aceita! Clique em "🗺️ Rota GPS" para iniciar.');
    } catch (e) { mostrarAviso('erro', 'Não foi possível aceitar esta entrega.'); }
  }

  function abrirModalFinalizar(pedido) {
    setModalConfirmacao({ aberto: true, pedido: pedido });
    setCodigoInserido('');
  }

  async function confirmarCodigoEFinalizar() {
    const pedido = modalConfirmacao.pedido;
    if (String(codigoInserido) === String(pedido.codigo_confirmacao)) {
      try {
        await updateDoc(doc(db, "pedidos", pedido.id), { status: "concluido", data_finalizacao: new Date() });
        setModalConfirmacao({ aberto: false, pedido: null });
        mostrarAviso('sucesso', 'Entrega finalizada com sucesso! Boas vendas.');
      } catch (e) { mostrarAviso('erro', 'Erro ao salvar finalização no banco de dados.'); }
    } else { mostrarAviso('erro', 'Código Inválido! Verifique o número com o cliente.'); }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 font-sans relative overflow-hidden">
      
      {/* Background Dinâmico */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-xl">🏍️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">Área do <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Motorista</span></h1>
            </div>
          </div>
          <button onClick={() => navigate('/principal')} className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-md">Voltar</button>
        </header>

        {/* Banner de Ativação de Alertas */}
        {!buscandoDados && (
          <div className="mb-8">
            <button 
              onClick={alternarAlertas}
              className={`w-full p-5 rounded-3xl flex items-center justify-between border backdrop-blur-md transition-all duration-300 shadow-xl group ${
                alertasAtivados 
                  ? "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50" 
                  : "bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${alertasAtivados ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400 animate-pulse'}`}>
                  {alertasAtivados ? "🔔" : "🔕"}
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Status do Radar</span>
                  <span className={`text-sm md:text-base font-bold ${alertasAtivados ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {alertasAtivados ? "ONLINE (Buscando Corridas)" : "OFFLINE (Alertas Silenciados)"}
                  </span>
                </div>
              </div>

              {/* Interruptor Visual */}
              <div className={`w-14 h-7 rounded-full relative transition-colors duration-300 border ${alertasAtivados ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-800 border-slate-700'}`}>
                <div className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${alertasAtivados ? 'left-[26px]' : 'left-[2px]'}`}></div>
              </div>
            </button>
          </div>
        )}

        {/* SELETOR DE ABAS */}
        <div className="flex bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl mb-8 overflow-x-auto border border-slate-800 shadow-lg">
          <button 
            onClick={() => setFiltro('todas')}
            className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs uppercase tracking-widest whitespace-nowrap transition-all duration-300 flex items-center justify-center gap-2 ${filtro === 'todas' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <span>🚀</span> Disponíveis
          </button>
          <button 
            onClick={() => setFiltro('andamento')}
            className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs uppercase tracking-widest whitespace-nowrap transition-all duration-300 flex items-center justify-center gap-2 ${filtro === 'andamento' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <span>📦</span> Em Andamento
          </button>
          <button 
            onClick={() => setFiltro('concluidas')}
            className={`flex-1 py-3 px-2 rounded-xl font-bold text-xs uppercase tracking-widest whitespace-nowrap transition-all duration-300 flex items-center justify-center gap-2 ${filtro === 'concluidas' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <span>✅</span> Concluídas
          </button>
        </div>

        {/* LISTA DE PEDIDOS */}
        <div className="space-y-5">
          {pedidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-800 border-dashed text-slate-500 animate-in fade-in">
              <span className="text-5xl mb-4">🛣️</span>
              <p className="font-medium">Nenhum pedido encontrado nesta categoria.</p>
            </div>
          ) : (
            pedidos.map((pedido) => (
              <div key={pedido.id} className="bg-slate-900/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 group hover:border-slate-700 transition-colors relative overflow-hidden">
                
                {/* Linha colorida de status na lateral esquerda */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  pedido.status === 'pendente' ? 'bg-orange-500' : 
                  pedido.status === 'em_transito' ? 'bg-blue-500' : 'bg-emerald-500'
                }`}></div>

                <div className="space-y-3 flex-1 pl-2">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                        pedido.status === 'pendente' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                        pedido.status === 'em_transito' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {pedido.status.replace('_', ' ')}
                      </span>
                      <span className="text-slate-500 text-xs font-medium">
                        {pedido.data?.toDate ? pedido.data.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                      </span>
                    </div>
                    <span className="text-slate-600 text-[10px] font-mono tracking-widest uppercase">ID: {pedido.id.substring(0, 6)}</span>
                  </div>

                  {/* Nome, KM e Pagamento */}
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs border border-slate-700 shrink-0">👤</div>
                      <p className="text-sm font-bold text-white">{pedido.nome_cliente || "Cliente"}</p>
                    </div>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <p className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 uppercase italic">
                      📏 {pedido.distancia_km || "0.0"} KM
                    </p>
                    <div className="w-px h-6 bg-slate-800"></div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                      💳 {pedido.metodo_pagamento?.replace('_', ' ')}
                    </p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      pedido.status_pagamento === 'pago_pelo_app' ? 'bg-emerald-500/20 text-emerald-400' : 
                      pedido.status_pagamento === 'cobrar_no_local' ? 'bg-orange-500/20 text-orange-400 animate-pulse' : 
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {pedido.status_pagamento === 'pago_pelo_app' ? '✓ JÁ PAGO' : 
                      pedido.status_pagamento === 'cobrar_no_local' ? '⚠️ RECEBER NO LOCAL' : 'AGUARDANDO'}
                    </span>
                  </div>

                  <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span></div>
                      <div>
                        <p className="text-slate-200 text-sm font-medium">{pedido.endereco_coleta}</p>
                        {pedido.obs_coleta && <p className="text-xs text-orange-400/80 font-medium italic mt-1 bg-orange-500/10 px-2 py-1 rounded inline-block">📝 Obs: {pedido.obs_coleta}</p>}
                      </div>
                    </div>
                    <div className="w-0.5 h-4 bg-slate-800 ml-[11px] my-1"></div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span></div>
                      <div>
                        <p className="text-slate-200 text-sm font-medium">{pedido.endereco_entrega}</p>
                        {pedido.obs_entrega && <p className="text-xs text-emerald-400/80 font-medium italic mt-1 bg-emerald-500/10 px-2 py-1 rounded inline-block">👤 Para: {pedido.obs_entrega}</p>}
                      </div>
                    </div>
                  </div>

                  {pedido.telefone_cliente && pedido.status === 'em_transito'&& (
                    <a 
                      href={`https://wa.me/55${pedido.telefone_cliente.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-500/20 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all group"
                    >
                      <span className="text-base group-hover:scale-110 transition-transform">💬</span> Falar com Cliente
                    </a>
                  )}
                </div>
                  
                {/* Lado Direito do Card (Valor e Botões de Ação) */}
                <div className="flex flex-col justify-center items-end border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-8 min-w-[200px]">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Valor</p>
                  <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 mb-6">
                    R$ {pedido.valor?.toFixed(2).replace('.', ',')}
                  </p>
                  
                  {filtro === 'todas' && (
                    <button onClick={() => confirmarAceite(pedido)} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 active:scale-95 transition-all">Aceitar Corrida</button>
                  )}

                  {filtro === 'andamento' && (
                    <div className="w-full space-y-3">
                      <button onClick={() => abrirRotaCompleta(pedido.endereco_coleta, pedido.endereco_entrega)} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-wider border border-slate-700 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                        <span>🗺️</span> Rota GPS
                      </button>
                      <button onClick={() => abrirModalFinalizar(pedido)} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 transition-all">
                        Finalizar Entrega
                      </button>
                    </div>
                  )}

                  {filtro === 'concluidas' && (
                    <div className="w-full text-center text-emerald-400 font-black uppercase text-xs tracking-widest border border-emerald-500/30 bg-emerald-500/10 py-3 rounded-xl flex items-center justify-center gap-2">
                      <span className="text-lg">✓</span> Finalizada
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* === MODAL DE ACEITE === */}
      {modalAceitar.aberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-slate-900 border border-orange-500/30 p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-orange-600"></div>
            <div className="bg-orange-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/20 text-4xl shadow-inner">🚀</div>
            <h3 className="text-2xl font-bold text-white mb-2">Aceitar Entrega?</h3>
            <p className="text-slate-400 text-sm mb-8">Ao aceitar, este pedido será direcionado imediatamente para você.</p>
            <div className="flex flex-col gap-3">
              <button onClick={executarAceite} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-orange-500/25 active:scale-95 transition-all">Sim, Aceitar!</button>
              <button onClick={() => setModalAceitar({ aberto: false, pedido: null })} className="w-full text-slate-500 font-bold py-3 hover:text-white transition-colors text-xs uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL DE FINALIZAÇÃO === */}
      {modalConfirmacao.aberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-slate-900 border border-blue-500/30 p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <div className="bg-blue-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20 text-4xl shadow-inner">🔐</div>
            <h3 className="text-2xl font-bold text-white mb-2">Finalizar Entrega</h3>
            <p className="text-slate-400 text-sm mb-6">Peça ao cliente o código de segurança de 4 dígitos para confirmar a entrega.</p>
            <input 
              type="text" 
              maxLength="4"
              placeholder="0000"
              value={codigoInserido}
              onChange={(e) => setCodigoInserido(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl py-5 text-center text-4xl font-black tracking-[15px] text-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none mb-8 transition-all placeholder:text-slate-700"
            />
            <div className="flex flex-col gap-3">
              <button onClick={confirmarCodigoEFinalizar} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition-all">Confirmar Código</button>
              <button onClick={() => setModalConfirmacao({ aberto: false, pedido: null })} className="w-full text-slate-500 font-bold py-3 hover:text-white transition-colors text-xs uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL DE FEEDBACK (SUCESSO OU ERRO) === */}
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

      {/* === MODAL DE GRITO: NOVA CORRIDA DETALHADA === */}
      {alertaNovoPedido.aberto && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-[500] animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900 border border-orange-500/50 p-6 md:p-8 rounded-[2rem] max-w-md w-full shadow-[0_0_80px_rgba(255,140,0,0.2)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-orange-500 animate-pulse"></div>
            
            <div className="mb-8 mt-4">
              <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl animate-bounce border border-orange-500/30 shadow-inner">🏍️</div>
              <h3 className="text-3xl font-bold text-white tracking-tight mb-4">Nova Entrega!</h3>
              <div className="inline-flex items-center justify-center bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-3 rounded-2xl shadow-lg shadow-orange-500/30">
                  <span className="text-4xl font-black text-white">R$ {alertaNovoPedido.pedido?.valor?.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="space-y-3 text-left mb-8">
              {/* COLETA */}
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Coleta</p>
                <p className="text-sm font-medium text-slate-200">{alertaNovoPedido.pedido?.endereco_coleta}</p>
                {alertaNovoPedido.pedido?.obs_coleta && (
                  <p className="text-[11px] text-orange-300/70 italic mt-3 border-l-2 border-orange-500/30 pl-3">
                    📝 {alertaNovoPedido.pedido?.obs_coleta}
                  </p>
                )}
              </div>

              {/* ENTREGA */}
              <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Entrega</p>
                <p className="text-sm font-medium text-slate-200">{alertaNovoPedido.pedido?.endereco_entrega}</p>
                {alertaNovoPedido.pedido?.obs_entrega && (
                  <p className="text-[11px] text-emerald-300/70 italic mt-3 border-l-2 border-emerald-500/30 pl-3">
                    👤 {alertaNovoPedido.pedido?.obs_entrega}
                  </p>
                )}
              </div>

              {/* DISTÂNCIA ACESA */}
              <div className="flex justify-center mt-6">
                <p className="inline-flex items-center bg-slate-800 px-5 py-3 rounded-xl border-l-4 border-orange-500 text-white shadow-inner">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mr-3">Distância Total:</span>
                  <span className="text-2xl font-black text-orange-400">{alertaNovoPedido.pedido?.distancia_km} KM</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button onClick={aceitarPeloGrito} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-5 rounded-2xl font-bold uppercase tracking-wider text-lg shadow-xl shadow-orange-500/25 active:scale-95 transition-all flex justify-center items-center gap-2">
                ACEITAR CORRIDA <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
              <button onClick={pararGritoERejeitar} className="w-full bg-transparent text-slate-500 py-3 font-bold uppercase text-[10px] tracking-widest hover:text-slate-300 transition-colors">
                Recusar e Ignorar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
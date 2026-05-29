import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { signOut } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth, db, GOOGLE_MAPS_API_KEY } from '../firebase';

const libraries = ['places', 'routes'];

export default function Principal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: libraries
  });
  
  // === ESTADOS DE NAVEGAÇÃO E UI ===
  const [exibirFormulario, setExibirFormulario] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('inicio'); 
  const [carregando, setCarregando] = useState(false);
  const [calculandoValor, setCalculandoValor] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  
  const [cobrarAteKm1, setCobrarAteKm1] = useState('');
  const [cobrarAteKm2, setCobrarAteKm2] = useState('');
  const [cobrarAteKm3, setCobrarAteKm3] = useState('');

  const [statusDesejado, setStatusDesejado] = useState('pendente');
  const [valoresConfig, setValoresConfig] = useState({
    taxaMinima: 12.00,
    kmMinimo: 3,
    valorKmAdicional: 1.80
  });

  // === ESTADOS DOS CAMPOS ===
  const [cepColeta, setCepColeta] = useState('');
  const [cidadeColeta, setCidadeColeta] = useState('');
  const [bairroColeta, setBairroColeta] = useState('');
  const [ruaColeta, setRuaColeta] = useState('');
  const [numeroColeta, setNumeroColeta] = useState('');
  const [obsColeta, setObsColeta] = useState('');
  const inputNumeroColetaRef = useRef(null);
  const inputNumeroEntregaRef = useRef(null);

  const audioRef = useRef(null); 
  const [alertaNovoPedido, setAlertaNovoPedido] = useState({ aberto: false, pedido: null });

  const [cepEntrega, setCepEntrega] = useState('');
  const [cidadeEntrega, setCidadeEntrega] = useState('');
  const [bairroEntrega, setBairroEntrega] = useState('');
  const [ruaEntrega, setRuaEntrega] = useState('');
  const [numeroEntrega, setNumeroEntrega] = useState('');
  const [obsEntrega, setObsEntrega] = useState('');
  const percentualPlataforma = parseFloat(valoresConfig?.percentualPlataformaAvulso || 20);

  const multiplicadorPlataforma = percentualPlataforma / 100;
  const multiplicadorMotorista = 1 - multiplicadorPlataforma; // O que sobra é do motoboy (Ex: 1 - 0.20 = 0.80)
  
  const [pagamento, setPagamento] = useState('pix');
  const [valorCorrida, setValorCorrida] = useState('0,00');
  const [distanciaFinal, setDistanciaFinal] = useState('0');
  const [cpfUsuario, setCpfUsuario] = useState('');
  const [IsLojista, setIsLojista] = useState('');
  
  const [mensagemWhatsApp, setMensagemWhatsApp] = useState('');
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [telefoneUsuario, setTelefoneUsuario] = useState('');
  const kmRef = useRef('0.0');
  const [tipoUsuarioLogado, setTipoUsuarioLogado] = useState('cliente');
  const [saldoCliente, setSaldoCliente] = useState(0);

  const [processandoPagamento, setProcessandoPagamento] = useState(false);

  const [modalFeedback, setModalFeedback] = useState({ aberto: false, tipo: '', mensagem: '' });

  const [estaAprovado, setEstaAprovado] = useState(false);
  const [alertasAtivados, setAlertasAtivados] = useState(false);
  const [buscandoDados, setBuscandoDados] = useState(true);

  const cadastroIncompleto = !buscandoDados && (!cpfUsuario || !telefoneUsuario);
  
  const gerarCodigoEntrega = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  useEffect(() => {
    if (location.state?.abaInicial === 'lista') {
      carregarHistorico('lista');
    }
  }, [location.state]);
  
  // === BUSCAR CONFIGURAÇÕES DE VALORES ASSIM QUE A TELA ABRE ===
  useEffect(() => {
    async function buscarConfiguracoes() {
      try {
        const docRef = doc(db, "configuracoes", "valores_corrida");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setValoresConfig(docSnap.data());
      } catch (error) {
        console.error("Erro ao buscar valores da corrida:", error);
      }
    }
    buscarConfiguracoes();
  }, []);

  // === FUNÇÃO PARA PEGAR LOCALIZAÇÃO ATUAL ===
  const usarLocalizacaoAtual = () => {
    if (!navigator.geolocation) {
      mostrarAviso('erro', 'Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setCarregando(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat: latitude, lng: longitude };

        try {
          const response = await geocoder.geocode({ location: latlng });
          if (response.results[0]) {
            const result = response.results[0];
            const novoEnd = { rua: '', bairro: '', cidade: '', cep: '', numero: '' };

            result.address_components.forEach((c) => {
              if (c.types.includes('route')) novoEnd.rua = c.long_name;
              if (c.types.includes('sublocality_level_1')) novoEnd.bairro = c.long_name;
              if (c.types.includes('administrative_area_level_2')) novoEnd.cidade = c.long_name;
              if (c.types.includes('postal_code')) novoEnd.cep = c.long_name.replace(/\D/g, '');
              if (c.types.includes('street_number')) novoEnd.numero = c.long_name;
            });

            setRuaColeta(novoEnd.rua);
            setBairroColeta(novoEnd.bairro);
            setCidadeColeta(novoEnd.cidade);
            setCepColeta(novoEnd.cep);
            setNumeroColeta(novoEnd.numero);
          } else {
            mostrarAviso('erro', 'Não encontramos um endereço para este ponto.');
          }
        } catch (error) {
          mostrarAviso('erro', 'Erro ao converter coordenadas em endereço.');
        } finally {
          setCarregando(false);
        }
      },
      (error) => {
        setCarregando(false);
        mostrarAviso('erro', 'Permissão de localização negada ou falhou.');
      }
    );
  };
  
  function mostrarAviso(tipo, msg) {
    setModalFeedback({ aberto: true, tipo: tipo, mensagem: msg });
  }

  const acColetaRef = useRef(null);
  const acEntregaRef = useRef(null);

  // === BUSCAR HISTÓRICO ===
  async function carregarHistorico(abaDestino = 'lista') {
    if (!auth.currentUser) return;
    setCarregando(true);
    try {
      const q = query(
        collection(db, "pedidos"),
        where("cliente_uid", "==", auth.currentUser.uid),
        orderBy("data", "desc")
      );
      const querySnapshot = await getDocs(q);
      setPedidos(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setAbaAtiva(abaDestino);
    } catch (e) { 
      setModalFeedback({ aberto: true, tipo: 'erro', mensagem: "Erro ao carregar dados." });
    }
    setCarregando(false);
  }

  // === BUSCA POR CEP ===
  async function handleCep(valor, tipo) {
    const cepLimpo = valor.replace(/\D/g, '');
    tipo === 'coleta' ? setCepColeta(valor) : setCepEntrega(valor);
    if (cepLimpo.length === 8) {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (tipo === 'coleta') {
          setRuaColeta(data.logradouro); setBairroColeta(data.bairro); setCidadeColeta(data.localidade);
        } else {
          setRuaEntrega(data.logradouro); setBairroEntrega(data.bairro); setCidadeEntrega(data.localidade);
        }
      }
    }
  }

  // === SELECIONAR NO GOOGLE ===
  const aoSelecionarGoogle = (tipo) => {
    const place = tipo === 'coleta' ? acColetaRef.current.getPlace() : acEntregaRef.current.getPlace();
    if (!place.address_components) return;

    const novoEnd = { rua: '', bairro: '', cidade: '', cep: '', numero: ''};
    place.address_components.forEach(c => {
      if (c.types.includes('route')) novoEnd.rua = c.long_name;
      if (c.types.includes('sublocality_level_1')) novoEnd.bairro = c.long_name;
      if (c.types.includes('administrative_area_level_2')) novoEnd.cidade = c.long_name;
      if (c.types.includes('postal_code')) novoEnd.cep = c.long_name;
      if (c.types.includes('street_number')) novoEnd.numero = c.long_name; 
    });

    if (tipo === 'coleta') {
      setRuaColeta(novoEnd.rua); setBairroColeta(novoEnd.bairro); setCidadeColeta(novoEnd.cidade); setCepColeta(novoEnd.cep); setNumeroColeta(novoEnd.numero)
      if (!novoEnd.numero && inputNumeroColetaRef.current) inputNumeroColetaRef.current.focus();
    } else {
      setRuaEntrega(novoEnd.rua); setBairroEntrega(novoEnd.bairro); setCidadeEntrega(novoEnd.cidade); setCepEntrega(novoEnd.cep); setNumeroEntrega(novoEnd.numero);
      if (!novoEnd.numero && inputNumeroEntregaRef.current) inputNumeroEntregaRef.current.focus();      
    }
  };

  // === CÁLCULO DE VALOR ===
  useEffect(() => {
    if (ruaColeta && numeroColeta && ruaEntrega && numeroEntrega) {
      const timer = setTimeout(() => {
        executarCalculo();
      }, 1000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruaColeta, numeroColeta, ruaEntrega, numeroEntrega, cidadeColeta, cidadeEntrega, valoresConfig]);
  
  useEffect(() => {
    async function buscarDadosPerfil() {
      if (!auth.currentUser) return;
      
      setBuscandoDados(true);
      const userDocRef = doc(db, "usuarios", auth.currentUser.uid);
      
      try {
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          const dados = docSnap.data();
          
          setTipoUsuarioLogado(dados.tipo || 'cliente');
          setNomeUsuario(dados.nome || "Usuário");
          setEstaAprovado(dados.aprovado || false);
          
          setAlertasAtivados(dados.notificacoesAtivas || false);

          setCpfUsuario(dados.cpf || '');
          setIsLojista(dados.lojista);
          setCobrarAteKm1(dados.cobrarAteKm1 || '');
          setCobrarAteKm2(dados.cobrarAteKm2 || '');
          setCobrarAteKm3(dados.cobrarAteKm3 || '');
          setTelefoneUsuario(dados.telefone || '');
          
          if (dados.saldo_carteira) setSaldoCliente(parseFloat(dados.saldo_carteira));
        } else {
          setCpfUsuario('');
          setTelefoneUsuario('');
        }
      } catch (error) {
        console.error("Erro ao buscar perfil:", error);
      } finally {
        setBuscandoDados(false); 
      }
    }
    
    buscarDadosPerfil();
  }, [auth.currentUser]);

  useEffect(() => {
    if (!auth.currentUser || tipoUsuarioLogado === 'cliente') return;

    const pedidosRef = collection(db, "pedidos");
    const qVigia = query(pedidosRef, where("status", "in", ["pendente", "aguardando_pagamento"]));

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
              audioRef.current.play().catch(e => console.log("Aguardando interação..."));

              setAlertaNovoPedido({ aberto: true, pedido: pedidoData });
            }
          }
        });
      }
      cargaInicialConcluida = true;
    });

    return () => unsubscribeVigia();
  }, [auth.currentUser, tipoUsuarioLogado, alertasAtivados]);

  const pararGritoERejeitar = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAlertaNovoPedido({ aberto: false, pedido: null });
  };

  const aceitarPeloGrito = async () => {
    const pedido = alertaNovoPedido.pedido;
    if (!pedido) return;

    try {
      await updateDoc(doc(db, "pedidos", pedido.id), {
        status: "em_transito",
        entregador_uid: auth.currentUser.uid,
        nome_entregador: nomeUsuario
      });

      pararGritoERejeitar(); 
      navigate('/motorista', { state: { abaInicial: 'andamento' } });
    } catch (e) {
      mostrarAviso('erro', 'Ops! Outro motorista foi mais rápido.');
      pararGritoERejeitar();
    }
  };

  async function executarCalculo() {
    if (!window.google || !window.google.maps) return;
    setCalculandoValor(true);

    try {
      const directionsService = new window.google.maps.DirectionsService();
      
      const request = {
        origin: `${ruaColeta}, ${numeroColeta}, ${cidadeColeta || 'Joinville'}, SC, Brasil`,
        destination: `${ruaEntrega}, ${numeroEntrega}, ${cidadeEntrega || 'Joinville'}, SC, Brasil`,
        travelMode: window.google.maps.TravelMode.DRIVING,
      };

      const response = await directionsService.route(request);
      
      if (response && response.routes && response.routes.length > 0) {
        const rota = response.routes[0].legs[0];
        const kmBrutoDaRota = rota.distance.value / 1000; 

        // 1. Coordenadas para Haversine
        const lat1 = rota.start_location.lat();
        const lon1 = rota.start_location.lng();
        const lat2 = rota.end_location.lat();
        const lon2 = rota.end_location.lng();

        const calcularLinhaReta = (lat1, lon1, lat2, lon2) => {
          const R = 6371; 
          const dLat = (lat2 - lat1) * (Math.PI / 180);
          const dLon = (lon2 - lon1) * (Math.PI / 180);
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        const kmLinhaReta = calcularLinhaReta(lat1, lon1, lat2, lon2);
        const kmMaxPermitido = kmLinhaReta * 1.35;
        let kmFinal = kmBrutoDaRota > kmMaxPermitido ? kmMaxPermitido : kmBrutoDaRota;

        setDistanciaFinal(kmFinal.toFixed(2));
        kmRef.current = kmFinal.toFixed(2);

        const lerNumero = (valor, fallback) => {
          if (!valor) return fallback;
          const numero = parseFloat(String(valor).replace(',', '.'));
          return isNaN(numero) ? fallback : numero;
        };

        const taxaBaseGlobal = lerNumero(valoresConfig?.taxaMinima, 12);
        const kmMinimoGlobal = lerNumero(valoresConfig?.kmMinimo, 3);
        
        // === 🚀 NOVO: VERIFICAÇÃO DE RUAS ESPECIAIS ===
        let valorBaseEspecial = null;
        
        if (valoresConfig?.ruasEspeciais && valoresConfig.ruasEspeciais.length > 0) {
          // Passamos para maiúsculo para garantir que vai achar independente de como foi digitado
          const ruaColNormalizada = (ruaColeta || "").toUpperCase();

          const ruaEncontrada = valoresConfig.ruasEspeciais.find(r => 
            ruaColNormalizada.includes(r.nome.toUpperCase()) 
          );

          if (ruaEncontrada) {
            valorBaseEspecial = parseFloat(ruaEncontrada.valorBase);
            console.log(`[RUA ESPECIAL IDENTIFICADA] ${ruaEncontrada.nome} - Valor Base: R$ ${valorBaseEspecial}`);
          }
        }

        // === INÍCIO DA NOVA LÓGICA DE CÁLCULO ===
        let total = 0;
        let kmRestante = 0;

        if (valorBaseEspecial !== null) {
          // CASO 1: RUA ESPECIAL TEM PRIORIDADE MÁXIMA
          total = valorBaseEspecial;
          
          // O KM restante vai descontar a franquia padrão (3km para lojista, ou a do sistema para comum)
          const franquiaKm = IsLojista ? 3 : kmMinimoGlobal;
          kmRestante = kmFinal - franquiaKm;
          
        } else if (IsLojista) { 
          // CASO 2: LÓGICA PARA LOJISTA (VALORES FIXOS)
          if (kmFinal <= 1) {
            total = lerNumero(cobrarAteKm1, taxaBaseGlobal);
          } else if (kmFinal <= 2) {
            total = lerNumero(cobrarAteKm2, taxaBaseGlobal);
          } else if (kmFinal <= 3) {
            total = lerNumero(cobrarAteKm3, taxaBaseGlobal);
          } else {
            // MAIOR QUE 3 KM
            total = lerNumero(cobrarAteKm3, taxaBaseGlobal);
            kmRestante = kmFinal - 3; 
          }
        } else {
          // CASO 3: CLIENTE COMUM
          total = taxaBaseGlobal;
          kmRestante = kmFinal - kmMinimoGlobal;
        }

        if (kmRestante < 0) kmRestante = 0;
        
        // CÁLCULO DAS FAIXAS ADICIONAIS (Continua igual)
        if (kmRestante > 0) {
          let f1 = Math.min(kmRestante, 5); 
          total += f1 * parseFloat(valoresConfig?.km3a8 || 1.6);
          kmRestante -= f1;
          
          if (kmRestante > 0) {
            let f2 = Math.min(kmRestante, 7); 
            total += f2 * parseFloat(valoresConfig?.km8a15 || 1.1);
            kmRestante -= f2;
            
            if (kmRestante > 0) {
              let f3 = Math.min(kmRestante, 10); 
              total += f3 * parseFloat(valoresConfig?.km15a25 || 1.6);
              kmRestante -= f3;
              
              if (kmRestante > 0) {
                let f4 = Math.min(kmRestante, 5); 
                total += f4 * parseFloat(valoresConfig?.km25a30 || 1.6);
                kmRestante -= f4;
                
                if (kmRestante > 0) {
                  total += kmRestante * parseFloat(valoresConfig?.kmAcima30 || 2.0);
                }
              }
            }
          }
        }

        // === ARREDONDAMENTO FINAL ===
        const totalCentavos = Math.round(total * 100);
        const centavosRestantes = totalCentavos % 100;
        let valorFinal = Math.floor(totalCentavos / 100);
        
        if (centavosRestantes > 0 && centavosRestantes <= 50) valorFinal += 0.50;
        else if (centavosRestantes > 50) valorFinal += 1.00;
        
        setValorCorrida(valorFinal.toFixed(2).replace('.', ','));
      }
    } catch (error) {
      console.error("Erro no cálculo:", error);
      setValorCorrida("0,00"); 
    } finally {
      setCalculandoValor(false);
    }
  }

  function limparFormulario() {
    setCepColeta(''); setCidadeColeta(''); setBairroColeta(''); setRuaColeta(''); setNumeroColeta(''); setObsColeta('');
    setCepEntrega(''); setCidadeEntrega(''); setBairroEntrega(''); setRuaEntrega(''); setNumeroEntrega(''); setObsEntrega('');
    setPagamento('pix'); setValorCorrida('0,00'); setExibirFormulario(false);
  }
  
  const enviarWhatsAppAdmin = (idPedido, msgCustomizada) => {
    const telefoneAdmin = "5547992231712";
    const linkBase = `https://api.whatsapp.com/send?phone=${telefoneAdmin}&text=${encodeURIComponent(msgCustomizada)}`;
    window.open(linkBase, '_blank');
  };
  
// === SALVAR NO FIREBASE COM INFINITEPAY E STATUS SEPARADOS ===
  async function salvarPedido(e) {
    e.preventDefault();

    // 1. Validações iniciais
    const valorNumerico = parseFloat(valorCorrida.replace(',', '.'));
    
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      mostrarAviso('erro', "Aguarde o cálculo da rota terminar antes de confirmar a entrega.");
      return;
    }

    if (pagamento === 'saldo' && saldoCliente < valorNumerico) {
      mostrarAviso('erro', "Saldo insuficiente para realizar esta corrida.");
      return;
    }

    setCarregando(true);

    try {
      const kmParaBanco = kmRef.current;
      
      // 2. Definindo Status de Corrida e Pagamento Separadamente
      let statusCorrida = "pendente"; // Padrão: libera para o motorista
      let statusPagamento = "pendente";

      if (pagamento === 'pix' || pagamento === 'cartao') {
        statusCorrida = "aguardando_pagamento"; // Esconde do motorista até a InfinitePay confirmar
        statusPagamento = "aguardando";
      } else if (pagamento === 'saldo') {
        statusPagamento = "pago_pelo_app"; // Já desconta na hora
      } else if (pagamento === 'dinheiro' || pagamento === 'maquininha') {
        statusPagamento = "cobrar_no_local"; // Motorista sabe que tem que receber
      }

      // === NOVIDADE: A MATEMÁTICA DOS 20/80 (O Cérebro da Operação) ===
      const taxaPlataforma = valorNumerico * multiplicadorPlataforma; // A parte da Flash Entregas
      const valorMotorista = valorNumerico * multiplicadorMotorista; // A parte do Motoboy

      // 3. Criar o documento do pedido no Firestore com os novos campos
      const docRef = await addDoc(collection(db, "pedidos"), {
        cliente_uid: auth.currentUser.uid,
        nome_cliente: nomeUsuario || "Cliente",
        telefone_cliente: telefoneUsuario || "",
        distancia_km: kmParaBanco,
        endereco_coleta: `${ruaColeta}, ${numeroColeta} - ${bairroColeta}`,
        endereco_entrega: `${ruaEntrega}, ${numeroEntrega} - ${bairroEntrega}`,
        obs_coleta: obsColeta, 
        obs_entrega: obsEntrega,
        valor: valorNumerico,               
        valor_motorista: valorMotorista,    
        taxa_plataforma: taxaPlataforma,    
        status: statusCorrida,              
        status_pagamento: statusPagamento,  
        metodo_pagamento: pagamento,
        codigo_confirmacao: gerarCodigoEntrega(),
        cep: cepColeta,
        data: serverTimestamp()
      });
      
      // 4. Lógica de Redirecionamento de Pagamento (INFINITEPAY)
      if (pagamento === 'pix' || pagamento === 'cartao') {
        
        const URL_GERAR_PAGAMENTO = "https://gerarlinkpagamento-cuihbvkkmq-uc.a.run.app";

        // === NOVIDADE: Busca os dados completos e fresquinhos do Perfil para o Antifraude ===
        const userDocRef = doc(db, "usuarios", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        const dadosUser = userDocSnap.exists() ? userDocSnap.data() : {};

        const response = await fetch(URL_GERAR_PAGAMENTO, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pedidoId: docRef.id,
            valor: valorNumerico,
            email: auth.currentUser?.email || dadosUser.email,
            nome: dadosUser.nome || nomeUsuario || "Cliente Flash",
            
            // Dados blindados para o Antifraude da InfinitePay:
            document: dadosUser.cpf || dadosUser.documento || "", // Puxa o CPF que salvamos no Perfil
            telefone: dadosUser.telefone || telefoneUsuario || "",
            
            // Endereço de Faturamento (Prioriza o Perfil, se não tiver, usa o da coleta)
            cep: dadosUser.cep || cepColeta,
            rua: dadosUser.rua || ruaColeta,        
            bairro: dadosUser.bairro || bairroColeta,   
            numero: dadosUser.numero || numeroColeta,   
            complemento: dadosUser.complemento || obsColeta, 
            
            descricao: `Entrega Flash #${docRef.id.substring(0,6)}`
          })
        });

        const dadosPagamento = await response.json();

        if (dadosPagamento.url) {
          
          await updateDoc(doc(db, "pedidos", docRef.id), {
            url_pagamento: dadosPagamento.url
          });

          window.location.href = dadosPagamento.url;
        } else {
          throw new Error("Não foi possível gerar o link de pagamento.");
        }

      } else {
        // 5. Fluxo para Pagamento em Dinheiro ou Saldo
        if (pagamento === 'saldo') {
          const novoSaldo = saldoCliente - valorNumerico;
          await updateDoc(doc(db, "usuarios", auth.currentUser.uid), {
            saldo_carteira: novoSaldo
          });
          setSaldoCliente(novoSaldo);
        }

        mostrarAviso('sucesso', "Pedido realizado com sucesso!");
        
        limparFormulario();
        await carregarHistorico();
      }

      const msgWhatsApp = `*🚨 NOVO PEDIDO (#${docRef.id.substring(0, 6).toUpperCase()})*\n` +
                            `👤 Cliente: ${nomeUsuario}\n` +
                            `💰 Valor: R$ ${valorCorrida}\n` +
                            `💳 Pagamento: ${pagamento.toUpperCase()}\n` +
                            `📍 Coleta: ${ruaColeta}, ${numeroColeta}\n` +
                            `🏁 Entrega: ${ruaEntrega}, ${numeroEntrega}\n\n`;

      enviarWhatsAppAdmin(docRef.id, msgWhatsApp);

    } catch (error) {
      console.error("Erro ao processar pedido:", error);
      mostrarAviso('erro', "Erro ao processar o pedido. Tente novamente.");
      setCarregando(false);
    } finally {
      setCarregando(false);
    }
  }

  // === 🚀 NOVIDADE: FUNÇÃO QUE VALIDA O HORÁRIO COM FUSO DE BRASÍLIA ===
  const verificarHorarioAtendimento = () => {
    const inicio = valoresConfig?.horarioInicio;
    const fim = valoresConfig?.horarioFim;
    
    // Se não tiver sido configurado no Admin ainda, deixa livre
    if (!inicio || !fim) return true; 

    // Formata a data atual garantindo que seja o fuso de Brasília, independente de onde o celular do cliente está
    const options = { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false };
    const formatter = new Intl.DateTimeFormat('pt-BR', options);
    const horaAtualStr = formatter.format(new Date());

    if (inicio < fim) {
      // Horário tradicional. Ex: 08:00 às 23:00
      return horaAtualStr >= inicio && horaAtualStr <= fim;
    } else {
      // Horário que atravessa a madrugada. Ex: 18:00 às 02:00
      return horaAtualStr >= inicio || horaAtualStr <= fim;
    }
  };

  const dentroDoHorario = verificarHorarioAtendimento();

  const handleSolicitarEntrega = () => {
    if (dentroDoHorario) {
      setExibirFormulario(true);
    } else {
      mostrarAviso('erro', `No momento estamos fechados. Nosso horário de atendimento é das ${valoresConfig.horarioInicio} às ${valoresConfig.horarioFim} (Horário de Brasília). Volte em breve!`);
    }
  };

  const botaoSalvarDesabilitado = calculandoValor || carregando || valorCorrida === '0,00' || valorCorrida === 'Calculando...' || isNaN(parseFloat(valorCorrida.replace(',', '.')));

  if (!isLoaded) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-orange-500 font-bold">Iniciando Mapas...</div>;

  return (
    <div className="min-h-screen flex flex-col font-sans text-white pb-24 relative bg-slate-950">
      
      {/* Background Dinâmico Padrão */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-10 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl transform scale-105"></div>
        <div className="absolute bottom-0 right-10 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl transform scale-110"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* HEADER */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        
        {/* LOGO (Esquerda) */}
        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => {setAbaAtiva('inicio'); setExibirFormulario(false);}}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-white font-black italic text-sm">F</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Flash <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Entregas.br</span>
          </h1>
        </div>
        
        {/* CONTROLES (Direita) - Perfil + Sair/Voltar juntos */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative flex flex-col items-end"></div>
          {/* BOTÃO DE PERFIL (Glow Laranja) */}
          <button 
            onClick={() => navigate('/perfil')}
            className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] border border-orange-300/50 transition-all hover:scale-105 active:scale-95 z-50"
            title="Meu Perfil"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>

          {/* ALERTA PISCANDO - Agora fica logo ABAIXO do botão */}
          {cadastroIncompleto && (
            <div className="absolute top-full mt-3 right-0 flex flex-col items-center animate-bounce z-[999]">
              <div className="bg-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-xl shadow-orange-500/40 whitespace-nowrap relative border border-orange-400">
                {/* Triângulo do balão ajustado para apontar para cima */}
                <div className="absolute -top-1 right-21 w-2 h-2 bg-orange-500 border-t border-l border-orange-400 rotate-45"></div>
                🚀 COMPLETE SEU PERFIL
              </div>
            </div>
          )}

          {/* BOTÃO VOLTAR / SAIR */}
          {(exibirFormulario || abaAtiva !== 'inicio') ? (
            <button 
              onClick={() => { setExibirFormulario(false); setAbaAtiva('inicio'); limparFormulario(); }} 
              className="flex items-center gap-1.5 sm:gap-2 bg-slate-900 text-slate-300 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white transition-all border border-slate-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
              <span className="hidden xs:inline">Voltar</span>
            </button>
          ) : (
            <button onClick={handleLogout} className="text-slate-400 text-sm hover:text-red-400 transition-colors flex items-center gap-1.5 sm:gap-2 font-medium">
              <span>Sair</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          )}

        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 flex flex-col items-center relative z-10">
        
        {/* 🛡️ ESCUDO DE CARREGAMENTO: Impede que botões apareçam ou sumam antes da hora */}
        {buscandoDados ? (
          <div className="flex flex-col items-center mt-20 gap-4 animate-in fade-in duration-500">
            <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium animate-pulse">Sincronizando portal...</p>
          </div>
        ) : (
          <>
            {/* === 1. MENU INICIAL (DASHBOARD) === */}
            {!exibirFormulario && abaAtiva === 'inicio' && (
              <div className="flex flex-col items-center mt-12 gap-5 w-full max-w-sm animate-in fade-in zoom-in duration-500">
                
                <div className="text-center mb-8">
                  <span className="text-orange-500 font-bold text-[10px] uppercase tracking-[3px] bg-orange-500/10 px-4 py-1.5 rounded-full border border-orange-500/20 mb-4 inline-block">
                    {tipoUsuarioLogado === 'admin' ? 'Acesso Administrativo' : tipoUsuarioLogado === 'motorista' ? 'Painel Motorista' : 'Portal do Cliente'}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                    Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                      {nomeUsuario.split(' ')[0] || 'Usuário'}
                    </span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-2">O que vamos entregar hoje?</p>
                </div>
                
                {/* ✨ LINK EXCLUSIVO PARA LOJISTAS */}
                {(cpfUsuario && cpfUsuario.length === 14 || IsLojista ) && tipoUsuarioLogado !== 'entregador' && (
                  <div className="mt-4 animate-in fade-in zoom-in duration-500 delay-150">
                    <a 
                      href="https://wa.me/5547992231712?text=Ol%C3%A1%2C%20sou%20lojista%20e%20gostaria%20de%20solicitar%20a%20tabela%20de%20pre%C3%A7os%20especial%20para%20entregas." 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      <span className="underline decoration-emerald-500/30 hover:decoration-emerald-400 underline-offset-4">Solicite sua tabela de preços</span>
                    </a>
                  </div>
                )}

                {/* === BOTÃO: Solicitar Entrega COM VERIFICAÇÃO DE HORÁRIO === */}
                <button 
                  onClick={handleSolicitarEntrega} 
                  className={`w-full px-8 py-4 rounded-2xl font-bold text-lg transform transition-all flex items-center justify-center gap-3 shadow-lg ${
                    dentroDoHorario 
                      ? "bg-gradient-to-r text-white hover:-translate-y-1 bg-gradient-to-r from-orange-800 to-orange-400"
                      : "bg-slate-800/80 text-slate-400 border border-slate-700 cursor-not-allowed"
                  }`}
                >
                  {dentroDoHorario ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Solicitar Nova Entrega
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex flex-col items-start text-left">
                        <span className="leading-tight">Fora do Horário</span>
                        {valoresConfig?.horarioInicio && (
                          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                            Retornamos às {valoresConfig.horarioInicio}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </button>

                {/* BOTÃO: Minhas Solicitações (LIVRE PARA TODOS) */}
                <button 
                  onClick={() => carregarHistorico('lista')} 
                  className="w-full bg-slate-900/80 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transform hover:-translate-y-1 bg-gradient-to-r from-green-950 to-orange-400 border border-slate-700 hover:border-slate-500 flex items-center justify-center gap-3"
                >
                  {carregando ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-white/20 border-t-white rounded-full"></div> 
                      Buscando...
                    </span>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg> 
                      Minhas Solicitações
                    </>
                  )}
                </button>

                {/* BOTÃO: Carteira (LIVRE PARA TODOS) */}
                <button 
                  onClick={() => navigate('/carteira')} 
                  className="w-full bg-slate-900/80 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transform hover:-translate-y-1 bg-gradient-to-r from-green-950 to-orange-400 border border-slate-700 hover:border-emerald-500 flex items-center justify-center gap-3 group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">💳</span> Minha Carteira
                </button>

                {/* BOTÃO: Área do Motorista (SÓ MOTORISTA E ADMIN) */}
                {['motorista', 'entregador', 'admin'].includes(tipoUsuarioLogado) && (
                  <button 
                    onClick={() => {
                      if (estaAprovado || tipoUsuarioLogado === 'admin') navigate('/motorista');
                      else mostrarAviso('erro', 'Sua conta ainda está em análise.');
                    }} 
                    className={`w-full px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transform hover:-translate-y-1 transition-all border flex items-center justify-center gap-3 ${
                      (estaAprovado || tipoUsuarioLogado === 'admin') 
                        ? "bg-gradient-to-r from-blue-900 to-orange-500 text-white border-blue-100/50 shadow-blue-500/10" 
                        : "bg-slate-800/50 text-slate-500 border-slate-700"
                    }`}
                  >
                    <span className="text-2xl">{(estaAprovado || tipoUsuarioLogado === 'admin') ? "🏍️" : "⏳"}</span> 
                    {(estaAprovado || tipoUsuarioLogado === 'admin') ? "Área do Motorista" : "Aguardando Aprovação"}
                  </button>
                )}

                {/* BOTÃO: Painel Admin */}
                {tipoUsuarioLogado === 'admin' && (
                  <button 
                    onClick={() => navigate('/admin')} 
                    className="w-full bg-slate-900/80 text-white-400 px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transform hover:-translate-y-1 bg-gradient-to-r from-red-800 to-orange-500 border border-red-500/20 hover:border-red-500 flex items-center justify-center gap-3"
                  >
                    <span className="text-2xl">🛡️</span> Painel Admin
                  </button>
                )}
              </div>
            )}

            {/* === 2. FORMULÁRIO RESPONSIVO === */}
            {exibirFormulario && (
              <div className="bg-slate-900/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-4xl animate-in fade-in duration-500">
                <h2 className="text-2xl font-bold border-b border-slate-800 pb-4 mb-6 flex items-center gap-3 text-white">
                  <span className="bg-orange-500/10 text-orange-500 p-2 rounded-xl">📦</span> Detalhes da Entrega
                </h2>
                <form onSubmit={salvarPedido} className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* COLETA */}
                    <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-orange-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Onde vamos Coletar?</h3>
                        <button type="button" onClick={usarLocalizacaoAtual} className="text-[10px] bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white px-3 py-1.5 rounded-full border border-orange-500/30 transition-all font-bold">Meu Local 📍</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="CEP" value={cepColeta} onChange={(e) => handleCep(e.target.value, 'coleta')} className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-orange-500 transition-all text-sm w-full" />
                        <input type="text" placeholder="Cidade" value={cidadeColeta} onChange={(e) => setCidadeColeta(e.target.value)} className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-orange-500 transition-all text-sm w-full" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <Autocomplete onLoad={ref => acColetaRef.current = ref} onPlaceChanged={() => aoSelecionarGoogle('coleta')}>
                            <input type="text" placeholder="Rua / Avenida" value={ruaColeta} onChange={e => setRuaColeta(e.target.value)} className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-orange-500 transition-all text-sm w-full" />
                          </Autocomplete>
                        </div>
                        <input type="text" placeholder="Nº" value={numeroColeta} onChange={(e) => setNumeroColeta(e.target.value)} ref={inputNumeroColetaRef} className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-orange-500 transition-all text-sm w-full" />
                      </div>
                      <input type="text" placeholder="Bairro" value={bairroColeta} onChange={(e) => setBairroColeta(e.target.value)} className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-orange-500 transition-all text-sm w-full" />
                      <input type="text" placeholder="Obs/Complemento" value={obsColeta} onChange={(e) => setObsColeta(e.target.value)} className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-orange-500 transition-all text-sm w-full" />
                    </div>

                    {/* ENTREGA */}
                    <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 space-y-4">
                      <div className="flex items-center mb-2 h-[34px]">
                        <h3 className="text-emerald-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Onde vamos entregar?</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="CEP" value={cepEntrega} onChange={(e) => handleCep(e.target.value, 'entrega')} className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-emerald-500 transition-all text-sm w-full" />
                        <input type="text" placeholder="Cidade" value={cidadeEntrega} onChange={(e) => setCidadeEntrega(e.target.value)} className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-emerald-500 transition-all text-sm w-full" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <Autocomplete onLoad={ref => acEntregaRef.current = ref} onPlaceChanged={() => aoSelecionarGoogle('entrega')}>
                            <input type="text" placeholder="Rua / Avenida" value={ruaEntrega} onChange={e => setRuaEntrega(e.target.value)} className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-emerald-500 transition-all text-sm w-full" />
                          </Autocomplete>
                        </div>
                        <input type="text" placeholder="Nº" value={numeroEntrega} onChange={(e) => setNumeroEntrega(e.target.value)} ref={inputNumeroEntregaRef} className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-emerald-500 transition-all text-sm w-full" />
                      </div>
                      <input type="text" placeholder="Bairro" value={bairroEntrega} onChange={(e) => setBairroEntrega(e.target.value)} className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-emerald-500 transition-all text-sm w-full" />
                      <input type="text" placeholder="Quem receberá?" value={obsEntrega} onChange={(e) => setObsEntrega(e.target.value)} className="bg-slate-900 text-white px-4 py-3 rounded-xl border border-slate-800 outline-none focus:border-emerald-500 transition-all text-sm w-full" />
                    </div>
                  </div>

                  {/* RODAPÉ DO FORMULÁRIO */}
                  <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-6 items-center mt-2">
                    
                    {/* BLOCO DO VALOR */}
                    <div className="flex flex-col items-center md:items-start w-full md:w-auto min-w-[180px]">
                      <p className="text-slate-400 text-xs font-bold mb-1 uppercase tracking-widest flex items-center gap-1">
                        💰 Valor Calculado {tipoUsuarioLogado === 'admin' && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded ml-1">(Editável)</span>}
                      </p>
                      
                      {calculandoValor || valorCorrida === 'Calculando...' ? (
                        <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 mt-2">
                          Calculando...
                        </span>
                      ) : tipoUsuarioLogado === 'admin' ? (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-2xl font-black text-orange-500">R$</span>
                          <input 
                            type="text" 
                            value={valorCorrida} 
                            onChange={(e) => setValorCorrida(e.target.value)}
                            className="bg-slate-900 border-b-2 border-orange-500 text-orange-400 font-black text-2xl md:text-3xl px-2 w-28 text-center outline-none focus:bg-slate-800 transition-colors"
                            title="Como Admin, você pode alterar este valor manualmente"
                          />
                        </div>
                      ) : (
                        <span className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                          R$ {valorCorrida}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full md:flex-1 md:justify-end">
                      <div className="relative w-full sm:w-auto flex-1 max-w-[250px]">
                        <select value={pagamento} onChange={e => setPagamento(e.target.value)} className="appearance-none w-full bg-slate-900 px-4 py-4 rounded-xl border border-slate-700 font-medium text-sm outline-none focus:border-orange-500 text-white transition-all cursor-pointer">
                          <option value="pix">Pix ou Crédito (Imediato) </option>
                          <option value="dinheiro">Dinheiro (Em Mãos)</option>
                          <option value="saldo" disabled={saldoCliente < (parseFloat(valorCorrida.replace(',', '.')) || 0)}>
                            {saldoCliente < (parseFloat(valorCorrida.replace(',', '.')) || 0) ? `Saldo Insuficiente` : `Saldo na Carteira (R$ ${saldoCliente.toFixed(2).replace('.', ',')})`}
                          </option>
                        </select>
                      </div>

                      <button type="submit" disabled={botaoSalvarDesabilitado} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 w-full sm:w-auto">
                        {calculandoValor || valorCorrida === 'Calculando...' ? "CALCULANDO..." : carregando ? "GERANDO..." : "CONFIRMAR PEDIDO"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* === 3. LISTA DE SOLICITAÇÕES === */}
            {abaAtiva === 'lista' && !exibirFormulario && (
              <div className="w-full max-w-4xl animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-8 bg-slate-900/50 backdrop-blur-md p-4 rounded-2xl border border-slate-800">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <span className="bg-blue-500/10 text-blue-400 p-2 rounded-xl">📋</span> Minhas Solicitações
                </h2>
              </div>

              <div className="space-y-4">
                {pedidos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed text-slate-500">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-2xl">📦</div>
                    <p className="font-medium">Você ainda não tem pedidos.</p>
                  </div>
                ) : (
                  pedidos.map((pedido) => (
                    <div key={pedido.id} className="bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-800 shadow-xl hover:border-slate-700 transition-all flex flex-col gap-4 relative overflow-hidden">
                      
                      {/* Linha Lateral de Status */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                          pedido.status === 'pendente' ? 'bg-orange-500' : 
                          pedido.status === 'em_transito' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}></div>

                      {/* CABEÇALHO DO CARD */}
                      <div className="flex justify-between items-start pl-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border ${
                            pedido.status === 'pendente' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                            pedido.status === 'em_transito' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {pedido.status.replace('_', ' ')}
                          </span>
                          <span className="text-slate-500 text-xs font-medium">
                            {pedido.data?.toDate ? pedido.data.toDate().toLocaleString([], {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) : '---'}
                          </span>
                        </div>
                        
                        <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-center">
                          <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5 tracking-widest">Código</p>
                          <p className="text-lg font-black text-white tracking-[4px]">{pedido.codigo_confirmacao}</p>
                        </div>
                      </div>

                      {/* ENDEREÇOS */}
                      <div className="pl-2 flex flex-col gap-3 mt-2">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span></div>
                          <div>
                            <p className="text-slate-200 text-sm font-medium">{pedido.endereco_coleta}</p>
                            {pedido.obs_coleta && <p className="text-xs text-orange-400/80 mt-1">Obs: {pedido.obs_coleta}</p>}
                          </div>
                        </div>
                        <div className="w-0.5 h-4 bg-slate-800 ml-[11px] my-1"></div>
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span></div>
                          <div>
                            <p className="text-slate-200 text-sm font-medium">{pedido.endereco_entrega}</p>
                            {pedido.obs_entrega && <p className="text-xs text-emerald-400/80 mt-1">Para: {pedido.obs_entrega}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-800 my-2 ml-2"></div>

                      {/* RODAPÉ DO CARD */}
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400 text-xs font-bold uppercase">
                          {pedido.distancia_km || "0.0"} KM
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs font-bold uppercase">
                            {pedido.metodo_pagamento} 
                            <span className={
                              pedido.status_pagamento === 'pago_pelo_app' ? ' text-emerald-400 ml-1' : 
                              pedido.status_pagamento === 'cobrar_no_local' ? ' text-orange-400 ml-1' : ' text-blue-400 ml-1'
                            }>
                              ({pedido.status_pagamento === 'pago_pelo_app' ? 'Pago' : 
                                pedido.status_pagamento === 'cobrar_no_local' ? 'Pagar na Entrega' : 'Aguardando'})
                            </span>
                          </span>

                          {/* BOTÃO DE RECUPERAÇÃO DE PAGAMENTO */}
                          {pedido.status_pagamento === 'aguardando' && pedido.url_pagamento && (
                            <a 
                              href={pedido.url_pagamento} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-blue-600/20 text-blue-400 border border-blue-600/30 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-md flex items-center gap-1"
                            >
                              <span>💸</span> Pagar Agora
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {/* Se tiver motorista */}
                      {(pedido.status === 'em_transito' || pedido.status === 'concluido') && pedido.nome_entregador && (
                        <div className="mt-2 ml-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">🏍️</div>
                            <div>
                              <p className="text-[10px] text-blue-400/80 uppercase font-bold">Motorista à caminho:</p>
                              <p className="text-sm font-bold text-slate-200">{pedido.nome_entregador}</p>
                            </div>
                          </div>

                          {/* BOTÃO DE LOCALIZAÇÃO - VISÍVEL APENAS EM TRÂNSITO */}
                          {pedido.status === 'em_transito' && pedido.lat_motorista && (
                          <button
                            onClick={() => {
                              const url = `https://www.google.com/maps?q=${pedido.lat_motorista},${pedido.lng_motorista}`;
                              window.open(url, '_blank');
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-500/20"
                          >
                            <span className="animate-pulse">📍</span> ACOMPANHAR EM TEMPO REAL
                          </button>
                        )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            )}
          </>
        )}
      </main>

      {/* MODAL DE FEEDBACK (SUCESSO/ERRO) */}
      {modalFeedback.aberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className={`bg-slate-900 border w-full max-w-sm rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-300 ${modalFeedback.tipo === 'sucesso' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${modalFeedback.tipo === 'sucesso' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {modalFeedback.tipo === 'sucesso' ? (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              ) : (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              )}
            </div>
            <h2 className="text-white font-bold text-2xl mb-2">
              {modalFeedback.tipo === 'sucesso' ? 'Tudo certo!' : 'Atenção'}
            </h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">{modalFeedback.mensagem}</p>
            <button 
              onClick={() => setModalFeedback({ aberto: false, tipo: '', mensagem: '' })}
              className={`w-full text-white py-4 rounded-xl font-bold transition-colors ${modalFeedback.tipo === 'sucesso' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* === MODAL DE GRITO (ALERTA PARA O MOTORISTA) === */}
      {alertaNovoPedido.aberto && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-[500] animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900 border border-orange-500/50 p-6 md:p-8 rounded-[2rem] max-w-md w-full shadow-[0_0_80px_rgba(255,140,0,0.2)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-orange-500 animate-pulse"></div>
            
            <div className="mb-8 mt-4">
              <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl animate-bounce">🏍️</div>
              <h3 className="text-3xl font-bold text-white tracking-tight mb-4">Nova Entrega!</h3>
              <div className="inline-flex items-center justify-center bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-2.5 rounded-2xl shadow-lg shadow-orange-500/20">
                  <span className="text-3xl font-black text-white">R$ {(alertaNovoPedido.pedido?.valor || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="space-y-3 text-left mb-8">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> Coleta</p>
                <p className="text-sm font-medium text-slate-200">{alertaNovoPedido.pedido?.endereco_coleta}</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Entrega</p>
                <p className="text-sm font-medium text-slate-200">{alertaNovoPedido.pedido?.endereco_entrega}</p>
              </div>
              <div className="flex justify-between items-center px-2 pt-2">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Distância</p>
                  <p className="text-lg font-bold text-slate-300">{alertaNovoPedido.pedido?.distancia_km} KM</p>
                </div>
                <div className="w-px h-8 bg-slate-700"></div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Pagamento</p>
                  <p className="text-sm font-bold text-slate-300 capitalize mt-1">{alertaNovoPedido.pedido?.metodo_pagamento?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button onClick={aceitarPeloGrito} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-5 rounded-2xl font-bold uppercase text-lg shadow-xl shadow-orange-500/25 active:scale-95 transition-all flex justify-center items-center gap-2">
                ACEITAR CORRIDA <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
              <button onClick={pararGritoERejeitar} className="w-full text-slate-500 py-3 font-bold text-sm hover:text-slate-300 transition-colors">
                Recusar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === BOTÃO INFORMATIVO NO RODAPÉ === */}
      {!exibirFormulario && abaAtiva === 'inicio' && (
        <button 
          type="button"
          onClick={() => setModalAberto(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-orange-500/30 text-orange-400 px-6 py-2.5 rounded-full font-medium text-sm hover:bg-orange-500/10 transition-all shadow-lg flex items-center gap-2 z-40"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Sobre e Tarifas
        </button>
      )}

      {/* === MODAL SOBREPOSTO (SOBRE NÓS) === */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[150]">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <span className="text-white font-black italic text-sm">F</span>
                </div>
                <h2 className="text-white font-bold text-lg">Flash Entregas.Br</h2>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-slate-500 hover:text-white text-2xl transition-colors">×</button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-white font-bold text-sm uppercase mb-2">🚀 Nossa Missão</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Garantir que seus produtos cheguem até seus clientes com segurança e agilidade total. Somos o braço direito do comerciante de Joinville.</p>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">💰</div>
                  <h3 className="text-white font-bold text-sm uppercase">Tabela de Preços</h3>
                </div>
                <div className="flex justify-between text-sm text-slate-300 mb-3 pb-3 border-b border-slate-700/50">
                  <span>Taxa Mínima ({valoresConfig.kmMinimo}km)</span>
                  <span className="font-bold text-orange-400">R$ {parseFloat(valoresConfig.taxaMinima).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                <h3 className="text-emerald-400 font-bold text-sm uppercase mb-1">💳 Flash Carteira</h3>
                <p className="text-slate-400 text-xs">Saldo pré-pago: peça entregas com um clique sem precisar de troco ou Pix na hora.</p>
              </div>
            </div>

            <button 
              onClick={() => setModalAberto(false)}
              className="w-full mt-8 bg-slate-800 text-white py-3 rounded-xl font-medium hover:bg-slate-700 transition-all border border-slate-700"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
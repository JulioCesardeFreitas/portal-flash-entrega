import { useState, useEffect } from 'react';
import { db, GOOGLE_MAPS_API_KEY } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

const bairrosJoinville = [
  "Adhemar Garcia", "América", "Anita Garibaldi", "Atiradores", "Aventureiro", 
  "Boa Vista", "Boehmerwald", "Bom Retiro", "Bucarein", "Centro", "Comasa", 
  "Costa e Silva", "Dona Francisca", "Espinheiros", "Fátima", "Floresta", 
  "Glória", "Guanabara", "Iririú", "Itaum", "Itinga", "Jardim Iririú", 
  "Jardim Paraíso", "Jardim Sofia", "Jarivatuba", "João Costa", "Morro do Meio", 
  "Nova Brasília", "Paranaguamirim", "Parque Guarani", "Petrópolis", "Pirabeiraba", 
  "Profipo", "Rio Bonito", "Saguaçu", "Santa Catarina", "Santo Antônio", 
  "São Marcos", "Ulysses Guimarães", "Vila Cubatão", "Vila Nova", 
  "Zona Industrial Norte", "Zona Industrial Tupy"
];

const libraries = ['places', 'routes'];

export default function TabelaPrecos() {
  const navigate = useNavigate();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries
  });

  const [origem, setOrigem] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [calculando, setCalculando] = useState(false);
  const [config, setConfig] = useState(null);
  const [nomeLocal, setNomeLocal] = useState('');
  
  const [modalFeedback, setModalFeedback] = useState({ aberto: false, tipo: '', mensagem: '' });

  useEffect(() => {
    async function carregarConfig() {
      const docSnap = await getDoc(doc(db, "configuracoes", "valores_corrida"));
      if (docSnap.exists()) setConfig(docSnap.data());
    }
    carregarConfig();
  }, []);

  function mostrarAviso(tipo, msg) {
    setModalFeedback({ aberto: true, tipo: tipo, mensagem: msg });
  }

  const calcularValorFaixas = (km) => {
    if (!config) return 0;
    let total = parseFloat(config?.taxaMinima || 12);
    let kmMin = parseFloat(config?.kmMinimo || 3);
    
    // CORRIGIDO: Usando a variável 'km' que vem do parâmetro da função
    let kmRestante = km - kmMin;

    if (kmRestante > 0) {
      let f1 = Math.min(kmRestante, 5); // Faixa 1: de 3 a 8 km
      total += f1 * parseFloat(config?.km3a8 || 1.6);
      kmRestante -= f1;
      
      if (kmRestante > 0) {
        let f2 = Math.min(kmRestante, 7); // Faixa 2: de 8 a 15 km
        total += f2 * parseFloat(config?.km8a15 || 1.1);
        kmRestante -= f2;
        
        if (kmRestante > 0) {
          let f3 = Math.min(kmRestante, 10); // Faixa 3: de 15 a 25 km
          total += f3 * parseFloat(config?.km15a25 || 1.6);
          kmRestante -= f3;
          
          if (kmRestante > 0) {
            let f4 = Math.min(kmRestante, 5); // Faixa 4: de 25 a 30 km (Tamanho da faixa: 5km)
            total += f4 * parseFloat(config?.km25a30 || 1.6);
            kmRestante -= f4;
            
            if (kmRestante > 0) {
              // Faixa 5: Acima de 30 km (Tudo que sobrar cai aqui)
              total += kmRestante * parseFloat(config?.kmAcima30 || 2.0);
            }
          }
        }
      }
    }
    
    const totalCentavos = Math.round(total * 100);
    const centavosRestantes = totalCentavos % 100;
    let valorFinal = Math.floor(totalCentavos / 100);
    if (centavosRestantes > 0 && centavosRestantes <= 50) valorFinal += 0.5;
    else if (centavosRestantes > 50) valorFinal += 1.0;
    
    return valorFinal;
  };

  const usarLocalizacaoAtual = () => {
    if (!navigator.geolocation) {
      mostrarAviso('erro', 'Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setCalculando(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat: latitude, lng: longitude };

        try {
          const response = await geocoder.geocode({ location: latlng });
          
          if (response.results[0]) {
            const enderecoFormatado = response.results[0].formatted_address;
            setOrigem(enderecoFormatado);

            // Busca estabelecimento (Nome do comércio)
            const estabelecimento = response.results.find(r => 
              r.types.includes('establishment') || r.types.includes('point_of_interest')
            );

            if (estabelecimento) {
              setNomeLocal(estabelecimento.formatted_address.split(',')[0]);
            } else {
              setNomeLocal(''); // Limpa se não achar nome, para não ficar o nome do cliente anterior
            }
          } else {
            mostrarAviso('erro', 'Não encontramos um endereço para este ponto.');
          } // <--- Faltava fechar este IF aqui
        } catch (error) {
          console.error(error);
          mostrarAviso('erro', 'Erro ao converter coordenadas em endereço.');
        } finally {
          setCalculando(false);
        }
      },
      (error) => {
        setCalculando(false);
        mostrarAviso('erro', 'Permissão de localização negada ou falhou.');
      }
    );
  };

  const gerarTabela = async () => {
    if (!origem || !window.google) return;
    setCalculando(true);

    const service = new window.google.maps.DistanceMatrixService();
    const lotes = [bairrosJoinville.slice(0, 23), bairrosJoinville.slice(23)];

    try {
      const promessas = lotes.map(lote => {
        return new Promise((resolve) => {
          service.getDistanceMatrix({
            origins: [origem],
            destinations: lote.map(b => `${b}, Joinville, SC`),
            travelMode: 'DRIVING',
          }, (response, status) => {
            if (status === 'OK') resolve(response.rows[0].elements);
            else resolve(new Array(lote.length).fill({ status: 'ZERO_RESULTS' }));
          });
        });
      });

      const todosLotes = await Promise.all(promessas);
      const flatResultados = todosLotes.flat();

      const tabelaFinal = flatResultados.map((res, index) => {
        const km = (res.status === 'OK' && res.distance) ? res.distance.value / 1000 : 0;
        return {
          bairro: bairrosJoinville[index],
          precoMin: calcularValorFaixas(Math.max(0, km - 1.5)),
          precoMax: calcularValorFaixas(km + 2.5)
        };
      });

      setResultados(tabelaFinal);
    } catch (error) {
      console.error("Erro ao gerar tabela:", error);
    } finally {
      setCalculando(false);
    }
  };

  const copiarWhatsApp = () => {
    let texto = `*🏁 TABELA ESTIMADA DE ENTREGAS - FLASH*\n`;
    texto += `🏢 *Parceiro: ${nomeLocal || 'Comércio'}*\n`;
    texto += `📍 _Saindo de: ${origem.split(',')[0]}_\n\n`;
    
    resultados.forEach(item => {
      texto += `*${item.bairro.toUpperCase()}*: R$ ${item.precoMin.toFixed(2).replace('.',',')} ~ ${item.precoMax.toFixed(2).replace('.',',')}\n`;
    });

    texto += `\n⚠️ _Valores sujeitos a alteração dependendo do endereço exato._`;

    navigator.clipboard.writeText(texto);
    mostrarAviso('sucesso', 'Tabela copiada com sucesso! Agora é só colar no WhatsApp do seu cliente. ✅');
  };

  const imprimirTabela = () => {
    window.print();
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Esconde tudo que não for a tabela (nav, botões, header) */
          nav, header, button, .print\\:hidden {
            display: none !important;
          }
          .bg-slate-950, .bg-slate-900, .bg-slate-800 {
            background: white !important;
            border: none !important;
            box-shadow: none !important;
          }
          /* Garante que o texto fique preto na impressão */
          span, p, div, h1, h2 {
            color: black !important;
          }
          /* Ajusta a grade para ficar em uma coluna na impressão se preferir */
          .grid {
            display: block !important;
          }
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-white-500 italic uppercase">Flash <span className="text-orange-500 ">B2B</span></h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-tighter">Gerador de Tabela de Preços por Bairro</p>
          </div>
          <button onClick={() => navigate('/admin')} className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all">VOLTAR</button>
        </header>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl mb-8">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Ponto de Partida (Loja/Comércio)</label>
          <div className="flex flex-col md:flex-row gap-3">
            {/* Botão de Localização Atual */}
            <button 
              onClick={usarLocalizacaoAtual}
              className="flex items-center gap-1 text-[10px] font-black text-white-400 hover:text-purple-300 transition-colors uppercase"
              title="Usar minha localização atual"
            >
              📍 Usar Localização
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <Autocomplete 
              className="flex-1" 
              onLoad={setAutocomplete} 
              onPlaceChanged={() => {
                const place = autocomplete.getPlace();
                setOrigem(place.formatted_address);
                // Se o lugar tiver um nome (e não for apenas o endereço), salvamos
                if (place.name && !place.name.includes(place.formatted_address.substring(0,5))) {
                  setNomeLocal(place.name);
                } else {
                  setNomeLocal('');
                }
              }}
            >
              <input 
                type="text" 
                placeholder="Endereço do parceiro..." 
                value={origem} // Adicione o value para o input refletir a localização automática
                onChange={(e) => setOrigem(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl outline-none focus:border-purple-500 transition-all" 
              />
            </Autocomplete>
            <button onClick={gerarTabela} disabled={calculando} className="bg-gradient-to-r from-green-950 to-orange-400 px-8 py-4 rounded-2xl font-black uppercase text-sm shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50">
              {calculando ? "PROCESSANDO..." : "GERAR TABELA"}
            </button>
          </div>
        </div>

        {resultados.length > 0 && (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 mb-20">
            
            {/* 1. VISUALIZAÇÃO NA TELA (Botões + Nome em Laranja) */}
            <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
                <div>
                  <h2 className="font-bold text-slate-200">
                    Tabela para: <span className="text-orange-500 uppercase">{nomeLocal || "Cliente Parceiro"}</span>
                  </h2>
                  <p className="text-[10px] text-slate-400 font-mono italic">Origem: {origem.substring(0, 60)}...</p>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={copiarWhatsApp}
                    className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all"
                  >
                    <span>📱</span> WhatsApp
                  </button>
                  <button 
                    onClick={imprimirTabela}
                    className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all"
                  >
                    <span>🖨️</span> PDF / Imprimir
                  </button>
                </div>
            </div>

            {/* 2. TÍTULO EXCLUSIVO PARA IMPRESSÃO (Fica oculto na tela, sai no PDF/Papel) */}
            <div className="hidden print:block p-8 text-center text-black">
                <h1 className="text-2xl font-black italic mb-1">FLASH ENTREGAS</h1>
                <h2 className="text-lg font-bold uppercase border-y-2 border-black py-2">
                  TABELA DE PREÇOS: {nomeLocal || "ESTIMATIVA POR BAIRRO"}
                </h2>
                <p className="text-[10px] mt-2 font-mono italic">Ponto de Partida: {origem}</p>
                <p className="text-[9px] mt-1 text-gray-600 italic">Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
            </div>

            {/* 3. GRID DA TABELA (A Lista de Bairros em si) */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-slate-800 print:bg-white print:text-black print:grid-cols-2">
              {resultados.map((item, idx) => (
                <div key={idx} className="bg-slate-900 p-4 flex justify-between items-center hover:bg-slate-800/30 print:bg-white print:border-b print:border-gray-200">
                  <span className="text-sm font-bold text-slate-400 print:text-black">{item.bairro}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-600 font-bold print:text-black">R$</span>
                    <span className="text-lg font-black text-orange-400 print:text-black">
                      {item.precoMin.toFixed(2).replace('.',',')} ~ {item.precoMax.toFixed(2).replace('.',',')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        )}
      </div>

      {/* MODAL DE FEEDBACK - DENTRO DO RETURN, NO FINAL */}
      {modalFeedback.aberto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
          <div className={`p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 text-center border ${modalFeedback.tipo === 'sucesso' ? 'bg-[#1a1a1a] border-green-500/30' : 'bg-[#1a1a1a] border-red-500/30'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border ${modalFeedback.tipo === 'sucesso' ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
              <span className="text-4xl">{modalFeedback.tipo === 'sucesso' ? '✅' : '❌'}</span>
            </div>
            <h3 className="text-2xl font-black uppercase italic text-white mb-2">
              {modalFeedback.tipo === 'sucesso' ? 'Sucesso!' : 'Ops!'}
            </h3>
            <p className="text-gray-400 text-sm mb-8">{modalFeedback.mensagem}</p>
            <button 
              onClick={() => setModalFeedback({ aberto: false, tipo: '', mensagem: '' })} 
              className={`w-full py-4 rounded-xl font-black uppercase text-sm shadow-lg active:scale-95 transition-all ${modalFeedback.tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600'}`}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
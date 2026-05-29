import { useState, useEffect, useRef } from 'react';
import { db, GOOGLE_MAPS_API_KEY } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const libraries = ['places', 'routes'];

export default function AdminValores() {
  const navigate = useNavigate();
  
  // INICIALIZAÇÃO DO GOOGLE MAPS NO ADMIN
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: libraries
  });
  const acRuaRef = useRef(null);

  // === NOVIDADE: ESTADOS DE HORÁRIO DE FUNCIONAMENTO ===
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');

  const [taxaMinima, setTaxaMinima] = useState('');
  const [kmMinimo, setKmMinimo] = useState('');
  
  // ESTADOS DE FAIXAS DE KM
  const [km3a8, setKm3a8] = useState('');
  const [km8a15, setKm8a15] = useState('');
  const [km15a25, setKm15a25] = useState('');
  const [km25a30, setKm25a30] = useState('');
  const [kmAcima30, setKmAcima30] = useState('');

  const [percentualPlataformaAvulso, setPercentualPlataformaAvulso] = useState('');
  const [percentualPlataformaAgrupado, setPercentualPlataformaAgrupado] = useState('');
  
  // === ESTADOS: RUAS ESPECIAIS ===
  const [ruasEspeciais, setRuasEspeciais] = useState([]);
  const [novaRuaNome, setNovaRuaNome] = useState('');
  const [novaRuaValor, setNovaRuaValor] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState({ mostrar: false, tipo: '', msg: '' });

  useEffect(() => {
    async function buscarValores() {
      try {
        const docRef = doc(db, "configuracoes", "valores_corrida");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const dados = docSnap.data();
          
          // Busca os horários (com fallback padrão caso não exista)
          setHorarioInicio(dados.horarioInicio || '08:00');
          setHorarioFim(dados.horarioFim || '23:00');

          setTaxaMinima(dados.taxaMinima);
          setKmMinimo(dados.kmMinimo);
          // Busca as novas faixas
          setKm3a8(dados.km3a8 || 1.60);
          setKm8a15(dados.km8a15 || 1.10);
          setKm15a25(dados.km15a25 || 1.60);
          setKm25a30(dados.km25a30 || 1.60);
          setKmAcima30(dados.kmAcima30 || 2.00);
          setPercentualPlataformaAvulso(dados.percentualPlataformaAvulso || '20'); 
          setPercentualPlataformaAgrupado(dados.percentualPlataformaAgrupado || '30');
          setRuasEspeciais(dados.ruasEspeciais || []);
        } else {
          setHorarioInicio('08:00');
          setHorarioFim('23:00');
          setTaxaMinima(12.00);
          setKmMinimo(3);
          setKm3a8(1.60);
          setKm8a15(1.10);
          setKm15a25(1.60);
          setKm25a30(1.60);
          setKmAcima30(2.00);
        }
      } catch (error) {
        console.error("Erro ao buscar configurações:", error);
      } finally {
        setCarregando(false);
      }
    }
    buscarValores();
  }, []);

  // === NOVIDADE: FUNÇÃO PARA PEGAR A RUA OFICIAL DO GOOGLE ===
  const aoSelecionarGoogleRua = () => {
    if (!acRuaRef.current) return;
    const place = acRuaRef.current.getPlace();
    if (!place.address_components) return;

    let nomeDaRua = '';
    // Filtra para pegar apenas o nome da rua, ignorando bairro, número, etc.
    place.address_components.forEach(c => {
      if (c.types.includes('route')) {
        nomeDaRua = c.long_name;
      }
    });
    
    if (nomeDaRua) {
      setNovaRuaNome(nomeDaRua);
    } else if (place.name) {
      setNovaRuaNome(place.name); 
    }
  };

  const adicionarRua = () => {
    if (!novaRuaNome.trim() || !novaRuaValor) return;
    
    setRuasEspeciais([...ruasEspeciais, {
      nome: novaRuaNome.trim().toUpperCase(),
      valorBase: parseFloat(novaRuaValor)
    }]);
    
    setNovaRuaNome('');
    setNovaRuaValor('');
  };

  const removerRua = (index) => {
    const novasRuas = ruasEspeciais.filter((_, i) => i !== index);
    setRuasEspeciais(novasRuas);
  };

  async function salvarValores(e) {
    e.preventDefault();
    setSalvando(true);
    
    try {
      const docRef = doc(db, "configuracoes", "valores_corrida");
      
      await setDoc(docRef, {
        // Salva os horários no banco
        horarioInicio: horarioInicio,
        horarioFim: horarioFim,

        taxaMinima: parseFloat(taxaMinima),
        kmMinimo: parseFloat(kmMinimo),
        // Salva as novas faixas
        km3a8: parseFloat(km3a8),
        km8a15: parseFloat(km8a15),
        km15a25: parseFloat(km15a25),
        km25a30: parseFloat(km25a30),
        kmAcima30: parseFloat(kmAcima30),
        percentualPlataformaAvulso: Number(percentualPlataformaAvulso),
        percentualPlataformaAgrupado: Number(percentualPlataformaAgrupado),
        ruasEspeciais: ruasEspeciais,
        atualizadoEm: new Date()
      }, { merge: true });
      
      setFeedback({ mostrar: true, tipo: 'sucesso', msg: 'Valores atualizados com sucesso! A tabela já está valendo para todos.' });
      setTimeout(() => setFeedback({ mostrar: false, tipo: '', msg: '' }), 4000);
    } catch (error) {
      console.error("Erro ao salvar valores:", error);
      setFeedback({ mostrar: true, tipo: 'erro', msg: 'Erro de permissão ou conexão ao salvar as configurações.' });
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-orange-500 font-bold font-sans">
        <svg className="animate-spin h-10 w-10 text-orange-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <span>Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center relative overflow-hidden font-sans">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 -right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="w-full max-w-2xl flex justify-between items-center mb-10 relative z-10 pt-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-white text-2xl">💰</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Precificação e Regras</h1>
            <p className="text-slate-400 text-sm">Ajuste valores e funcionamento da plataforma</p>
          </div>
        </div>
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 bg-slate-900 text-slate-300 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 hover:text-white transition-all border border-slate-700 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
          Voltar
        </button>
      </div>

      <form onSubmit={salvarValores} className="bg-slate-900/80 backdrop-blur-xl p-6 md:p-10 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-2xl relative z-10">
        
        {feedback.mostrar && (
          <div className={`p-4 rounded-xl mb-8 font-medium text-sm flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${feedback.tipo === 'sucesso' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            <span className="text-xl">{feedback.tipo === 'sucesso' ? '✅' : '❌'}</span>
            {feedback.msg}
          </div>
        )}

        {/* === NOVA SEÇÃO: HORÁRIO DE FUNCIONAMENTO === */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-orange-500">⏰</span> Horário de Atendimento
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            O botão de solicitação ficará indisponível fora desta faixa de horário. 
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-orange-500/50 transition-colors">
              <label className="text-slate-400 text-xs font-bold mb-2 block uppercase tracking-widest">Abre às</label>
              <div className="relative">
                <input 
                  type="time" 
                  required 
                  value={horarioInicio} 
                  onChange={(e) => setHorarioInicio(e.target.value)} 
                  className="w-full bg-slate-900 px-4 py-3 rounded-lg border border-slate-700 outline-none focus:border-orange-500 text-white font-bold text-lg text-center" 
                />
              </div>
            </div>
            
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-orange-500/50 transition-colors">
              <label className="text-slate-400 text-xs font-bold mb-2 block uppercase tracking-widest">Fecha às</label>
              <div className="relative">
                <input 
                  type="time" 
                  required 
                  value={horarioFim} 
                  onChange={(e) => setHorarioFim(e.target.value)} 
                  className="w-full bg-slate-900 px-4 py-3 rounded-lg border border-slate-700 outline-none focus:border-orange-500 text-white font-bold text-lg text-center" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CAMPO: TAXA MÍNIMA */}
            <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50 relative overflow-hidden group hover:border-orange-500/50 transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
              <label className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-3 block ml-2">Taxa Mínima (R$)</label>
              <div className="flex-1 relative ml-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                <input type="number" step="0.01" required value={taxaMinima} onChange={(e) => setTaxaMinima(e.target.value)} className="w-full bg-slate-900 px-12 py-3 rounded-xl border border-slate-700 outline-none focus:border-orange-500 text-xl font-black text-white" />
              </div>
            </div>

            {/* CAMPO: KM MÍNIMO */}
            <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
              <label className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-3 block ml-2">Franquia Inicial</label>
              <div className="flex-1 relative ml-2">
                <input type="number" step="0.1" required value={kmMinimo} onChange={(e) => setKmMinimo(e.target.value)} className="w-full bg-slate-900 px-4 pr-12 py-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 text-xl font-black text-white" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">KM</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 mt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">📍 Tabela de KM Adicional</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* FAIXA 1 */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition-colors">
                <label className="text-slate-400 text-xs font-bold mb-2 block">De 3 a 8 KM (R$/km)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                  <input type="number" step="0.01" required value={km3a8} onChange={(e) => setKm3a8(e.target.value)} className="w-full bg-slate-900 px-10 py-2 rounded-lg border border-slate-700 outline-none focus:border-emerald-500 text-white font-bold" />
                </div>
              </div>

              {/* FAIXA 2 */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-teal-500/50 transition-colors">
                <label className="text-slate-400 text-xs font-bold mb-2 block">De 8 a 15 KM (R$/km)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                  <input type="number" step="0.01" required value={km8a15} onChange={(e) => setKm8a15(e.target.value)} className="w-full bg-slate-900 px-10 py-2 rounded-lg border border-slate-700 outline-none focus:border-teal-500 text-white font-bold" />
                </div>
              </div>

              {/* FAIXA 3 */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-cyan-500/50 transition-colors">
                <label className="text-slate-400 text-xs font-bold mb-2 block">De 15 a 25 KM (R$/km)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                  <input type="number" step="0.01" required value={km15a25} onChange={(e) => setKm15a25(e.target.value)} className="w-full bg-slate-900 px-10 py-2 rounded-lg border border-slate-700 outline-none focus:border-cyan-500 text-white font-bold" />
                </div>
              </div>

              {/* FAIXA 4 */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-colors">
                <label className="text-slate-400 text-xs font-bold mb-2 block">De 25 a 30 KM (R$/km)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                  <input type="number" step="0.01" required value={km25a30} onChange={(e) => setKm25a30(e.target.value)} className="w-full bg-slate-900 px-10 py-2 rounded-lg border border-slate-700 outline-none focus:border-indigo-500 text-white font-bold" />
                </div>
              </div>

              {/* FAIXA 5 */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-colors">
                <label className="text-slate-400 text-xs font-bold mb-2 block">Acima de 30 KM (R$/km)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                  <input type="number" step="0.01" required value={kmAcima30} onChange={(e) => setKmAcima30(e.target.value)} className="w-full bg-slate-900 px-10 py-2 rounded-lg border border-slate-700 outline-none focus:border-indigo-500 text-white font-bold" />
                </div>
              </div>

            </div>
          </div>
        </div>
        {/* === NOVA SEÇÃO: DIVISÃO DE LUCROS === */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl mt-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-emerald-500">💰</span> Divisão de Lucros (Plataforma)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* FAIXA: AVULSO */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition-colors">
              <label className="text-slate-400 text-xs font-bold mb-2 block">Pedidos Avulsos (%)</label>
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                <input 
                  type="number" 
                  step="0.1" 
                  required 
                  value={percentualPlataformaAvulso} 
                  onChange={(e) => setPercentualPlataformaAvulso(e.target.value)} 
                  className="w-full bg-slate-900 px-4 py-2 pr-10 rounded-lg border border-slate-700 outline-none focus:border-emerald-500 text-white font-bold" 
                />
              </div>
            </div>

            {/* FAIXA: AGRUPADO */}
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition-colors">
              <label className="text-slate-400 text-xs font-bold mb-2 block">Pedidos Agrupados (%)</label>
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                <input type="number" step="0.1" required value={percentualPlataformaAgrupado} onChange={(e) => setPercentualPlataformaAgrupado(e.target.value)} className="w-full bg-slate-900 px-4 py-2 pr-10 rounded-lg border border-slate-700 outline-none focus:border-emerald-500 text-white font-bold" />
              </div>
            </div>
          </div>
        </div>

        {/* === SEÇÃO: RUAS ESPECIAIS (AGORA COM AUTOCOMPLETE DO GOOGLE) === */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl mt-6">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-blue-500">🛣️</span> Valores Específicos por Rua de Coleta
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Use a busca do Google para selecionar a rua. O sistema garantirá que o nome bata exatamente com o que o cliente digitar.
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 items-end mb-6">
            <div className="flex-1 w-full">
              <label className="text-slate-400 text-xs font-bold mb-2 block">Nome da Rua</label>
              {isLoaded ? (
                <Autocomplete onLoad={ref => acRuaRef.current = ref} onPlaceChanged={aoSelecionarGoogleRua}>
                  <input 
                    type="text" 
                    placeholder="Comece a digitar o nome da rua..."
                    value={novaRuaNome}
                    onChange={(e) => setNovaRuaNome(e.target.value)}
                    className="w-full bg-slate-900 px-4 py-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 text-white font-medium"
                  />
                </Autocomplete>
              ) : (
                <input type="text" disabled placeholder="Carregando Mapas..." className="w-full bg-slate-900 px-4 py-3 rounded-xl border border-slate-700 text-slate-500" />
              )}
            </div>
            
            <div className="w-full md:w-1/3">
              <label className="text-slate-400 text-xs font-bold mb-2 block">Valor Inicial (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Ex: 25.00"
                  value={novaRuaValor}
                  onChange={(e) => setNovaRuaValor(e.target.value)}
                  className="w-full bg-slate-900 px-10 py-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 text-white font-bold"
                />
              </div>
            </div>

            <button 
              type="button" 
              onClick={adicionarRua}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold uppercase transition-all shadow-lg shadow-blue-500/20"
            >
              Adicionar
            </button>
          </div>

          {/* Lista de Ruas Adicionadas */}
          {ruasEspeciais.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {ruasEspeciais.map((rua, index) => (
                <div key={index} className="flex justify-between items-center bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                  <div>
                    <p className="font-bold text-white text-sm">{rua.nome}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Valor Especial: <span className="text-orange-400 font-bold">R$ {rua.valorBase.toFixed(2).replace('.', ',')}</span>
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removerRua(index)}
                    className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20"
                    title="Remover rua"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 border border-dashed border-slate-700 rounded-xl">
              <p className="text-sm">Nenhuma rua especial de coleta configurada.</p>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-slate-800 pt-6 flex justify-end">
          <button type="submit" disabled={salvando} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-xl font-bold uppercase shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all w-full md:w-auto">
            {salvando ? "SALVANDO..." : "SALVAR PREÇOS E REGRAS"}
          </button>
        </div>
      </form>
    </div>
  );
}
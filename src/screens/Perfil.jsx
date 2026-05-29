import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, storage } from '../firebase'; // ADICIONADO: storage
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // ADICIONADO: funções de upload

export default function Perfil() {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });

  // Estado unificado para os dados do perfil
  const [perfil, setPerfil] = useState({
    nome: '',
    nome_comercio: '',
    email: '',
    cpf: '',
    telefone: '',
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    tipo: '',      // ADICIONADO
    cnh_url: '',   // ADICIONADO
    crv_url: ''    // ADICIONADO
  });

  // --- ADICIONADO: ESTADOS PARA OS ARQUIVOS ---
  const [novaCnh, setNovaCnh] = useState(null);
  const [novoCrv, setNovoCrv] = useState(null);

  // --- BUSCA DE CEP AUTOMÁTICA ---
  const buscarCep = async (cepParaBuscar) => {
    const cepLimpo = cepParaBuscar.replace(/\D/g, '');
    
    // Só busca se tiver exatamente 8 números
    if (cepLimpo.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (!data.erro) {
        // Atualiza o estado do perfil com os dados dos Correios
        setPerfil(prev => ({
          ...prev,
          rua: data.logradouro || prev.rua,
          bairro: data.bairro || prev.bairro,
          // O estado de cidade/estado iria aqui se você usasse
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };
  
  useEffect(() => {
    async function carregarPerfil() {
      if (!auth.currentUser) {
        navigate('/'); // Redireciona se não estiver logado
        return;
      }

      try {
        const docRef = doc(db, "usuarios", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const dados = docSnap.data();
          setPerfil({
            nome: dados.nome || auth.currentUser.displayName || '',
            nome_comercio: dados.nome_comercio || '',
            email: auth.currentUser.email || '',
            cpf: dados.cpf || dados.documento || '',
            telefone: dados.telefone || '',
            cep: dados.cep || '',
            rua: dados.rua || '',
            numero: dados.numero || '',
            complemento: dados.complemento || '',
            bairro: dados.bairro || '',
            tipo: dados.tipo || 'cliente', // ADICIONADO
            cnh_url: dados.cnh_url || '',  // ADICIONADO
            crv_url: dados.crv_url || ''   // ADICIONADO
          });
        }
      } catch (error) {
        console.error("Erro ao buscar perfil:", error);
        mostrarMensagem('erro', 'Erro ao carregar seus dados.');
      } finally {
        setCarregando(false);
      }
    }

    carregarPerfil();
  }, [navigate]);

  // --- ADICIONADO: FUNÇÃO PARA CAPTURAR ARQUIVOS ---
  const handleFileChange = (e, tipoDoc) => {
    const file = e.target.files[0];
    if (file) {
      if (tipoDoc === 'cnh') setNovaCnh(file);
      if (tipoDoc === 'crv') setNovoCrv(file);
    }
  };

  // --- MÁSCARAS DE FORMATAÇÃO ---
  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === 'cpf') {
      // Remove tudo o que não for número
      let apenasNumeros = value.replace(/\D/g, '');
      
      // Limita a 14 números no máximo (tamanho de um CNPJ)
      if (apenasNumeros.length > 14) {
        apenasNumeros = apenasNumeros.substring(0, 14);
      }

      // Aplica a máscara dinâmica
      if (apenasNumeros.length <= 11) {
        // Máscara de CPF
        value = apenasNumeros
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})/, '$1-$2');
      } else {
        // Máscara de CNPJ
        value = apenasNumeros
          .replace(/(\d{2})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1/$2')
          .replace(/(\d{4})(\d{1,2})/, '$1-$2');
      }
    }

    if (name === 'telefone') {
      value = value.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{4})(\d+?)$/, '$1-$2'); // Formato (XX) XXXXX-XXXX
    }

    if (name === 'cep') {
      value = value.replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1');

        if (value.length === 9) {
        buscarCep(value);
      }
    }

    setPerfil(prev => ({ ...prev, [name]: value }));
  };

  // --- SALVAR NO FIREBASE ---
  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMensagem({ texto: '', tipo: '' });

    try {
      // --- LÓGICA DE UPLOAD DE ARQUIVOS ---
      let urlsAtualizadas = {};
      let documentosAlterados = false; // ✨ NOVA FLAG DE CONTROLE

      if (novaCnh) {
        const cnhRef = ref(storage, `documentos_entregadores/${auth.currentUser.uid}/cnh.jpg`);
        await uploadBytes(cnhRef, novaCnh);
        urlsAtualizadas.cnh_url = await getDownloadURL(cnhRef);
        documentosAlterados = true; // ✨ MARCA QUE HOUVE ALTERAÇÃO
      }

      if (novoCrv) {
        const crvRef = ref(storage, `documentos_entregadores/${auth.currentUser.uid}/crv.jpg`);
        await uploadBytes(crvRef, novoCrv);
        urlsAtualizadas.crv_url = await getDownloadURL(crvRef);
        documentosAlterados = true; // ✨ MARCA QUE HOUVE ALTERAÇÃO
      }
      // --- FIM DA LÓGICA DE UPLOAD ---

      const docRef = doc(db, "usuarios", auth.currentUser.uid);
      
      // Salva os dados limpando a formatação e mantendo os nomes originais
      const dadosParaSalvar = {
        ...perfil,
        cpf: perfil.cpf.replace(/\D/g, ''),
        telefone: perfil.telefone.replace(/\D/g, ''),
        cep: perfil.cep.replace(/\D/g, ''),
        atualizado_em: new Date(),
        ...urlsAtualizadas
      };

      // ✨ SE MUDOU O DOCUMENTO, VOLTA PARA PENDENTE AUTOMATICAMENTE
      if (documentosAlterados) {
        dadosParaSalvar.aprovado = false;
        dadosParaSalvar.status_aprovacao = "pendente";
      }

      await updateDoc(docRef, dadosParaSalvar);
      
      // Atualiza a tela com as novas URLs e limpa os inputs de arquivo
      setPerfil(prev => ({ ...prev, ...urlsAtualizadas }));
      setNovaCnh(null);
      setNovoCrv(null);

      // ✨ MENSAGEM DINÂMICA PARA AVISAR O USUÁRIO
      if (documentosAlterados) {
        mostrarMensagem('sucesso', 'Documentos enviados! Seu perfil voltou para análise. Entre em contato com o administrador! ⏳');
      } else {
        mostrarMensagem('sucesso', 'Perfil atualizado com sucesso! 🚀');
      }
      
    } catch (error) {
      console.error("Erro ao salvar:", error);
      mostrarMensagem('erro', 'Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  };

  const mostrarMensagem = (tipo, texto) => {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem({ texto: '', tipo: '' }), 4000);
  };

  if (carregando) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-orange-500 font-bold">Carregando perfil...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white pb-10">
      {/* HEADER */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-xl">👤</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Meu <span className="text-orange-400">Perfil</span></h1>
        </div>
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 bg-slate-900 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white transition-all border border-slate-700"
        >
          Voltar
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 mt-4 animate-in fade-in duration-500">
        
        {mensagem.texto && (
          <div className={`mb-6 p-4 rounded-xl border ${mensagem.tipo === 'sucesso' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} flex items-center gap-3`}>
            <span>{mensagem.tipo === 'sucesso' ? '✅' : '❌'}</span>
            <p className="font-medium text-sm">{mensagem.texto}</p>
          </div>
        )}

        <form onSubmit={handleSalvar} className="space-y-8">
          
          {/* SESSÃO: DADOS PESSOAIS */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-orange-500">📋</span> Dados Pessoais
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
                <input 
                  type="text" name="nome" value={perfil.nome} onChange={handleChange} required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  placeholder="Seu nome"
                />
              </div>

              {/* ✨ NOVO: NOME DO COMÉRCIO */}
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1 text-orange-400">Nome do Comércio \ NickName</label>
                <input 
                  type="text" name="nome_comercio" value={perfil.nome_comercio} onChange={handleChange}
                  className="w-full bg-slate-950 border border-orange-500/30 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  placeholder="Nome da loja"
                />
              </div>

              {/* CAMPO DE E-MAIL (SOMENTE LEITURA) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1 flex items-center gap-2">
                  E-mail de Acesso 
                </label>
                <input 
                  type="email" name="email" value={perfil.email} readOnly
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">CPF\CNPJ</label>
                <input 
                  type="text" name="cpf" value={perfil.cpf} onChange={handleChange} required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Contato</label>
                <input 
                  type="text" name="telefone" value={perfil.telefone} onChange={handleChange} required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          {/* SESSÃO: ENDEREÇO */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-orange-500">📍</span> Endereço
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">CEP</label>
                <input 
                  type="text" name="cep" value={perfil.cep} onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  placeholder="00000-000"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Rua / Avenida</label>
                <input 
                  type="text" name="rua" value={perfil.rua} onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  placeholder="Ex: Rua das Flores"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Número</label>
                <input 
                  type="text" name="numero" value={perfil.numero} onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  placeholder="Ex: 123"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Complemento</label>
                <input 
                  type="text" name="complemento" value={perfil.complemento} onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  placeholder="Apt 42"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Bairro</label>
                <input 
                  type="text" name="bairro" value={perfil.bairro} onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                  placeholder="Centro"
                />
              </div>
            </div>
          </div>

          {/* --- ADICIONADO: SESSÃO DOCUMENTOS (APENAS ENTREGADOR) --- */}
          {(perfil.tipo === 'entregador' || perfil.tipo === 'admin') && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-orange-500">📄</span> Documentos (Restrito a Entregadores)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-700 rounded-xl p-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Atualizar CNH
                  </label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, 'cnh')}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500/10 file:text-orange-500 hover:file:bg-orange-500/20 transition-all cursor-pointer"
                  />
                  {perfil.cnh_url && !novaCnh && (
                    <a href={perfil.cnh_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs text-blue-400 hover:text-blue-300 underline">
                      Ver documento anexado
                    </a>
                  )}
                  {novaCnh && <p className="mt-3 text-xs text-emerald-400">✅ Arquivo pronto para salvar</p>}
                </div>

                <div className="bg-slate-950 border border-slate-700 rounded-xl p-4">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Atualizar Doc. Veículo (CRV)
                  </label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, 'crv')}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-500/10 file:text-orange-500 hover:file:bg-orange-500/20 transition-all cursor-pointer"
                  />
                  {perfil.crv_url && !novoCrv && (
                    <a href={perfil.crv_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs text-blue-400 hover:text-blue-300 underline">
                      Ver documento anexado
                    </a>
                  )}
                  {novoCrv && <p className="mt-3 text-xs text-emerald-400">✅ Arquivo pronto para salvar</p>}
                </div>
              </div>
            </div>
          )}

          {/* BOTÃO SALVAR */}
          <div className="pt-4">
            <button 
              type="submit" 
              disabled={salvando}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg hover:shadow-orange-500/25 active:scale-95 transition-all text-sm disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {salvando ? 'Salvando...' : '💾 Salvar Alterações'}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db, storage } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function Cadastro() {
  const navigate = useNavigate();

  // Estados dos Campos
  const [tipoUsuario, setTipoUsuario] = useState('cliente');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  
  // Estados para Documentos (Entregador)
  const [cnhFile, setCnhFile] = useState(null);
  const [crvFile, setCrvFile] = useState(null);
  const [carregando, setCarregando] = useState(false);

  // Estado para Modal Moderno (Substituindo os alerts)
  const [modalFeedback, setModalFeedback] = useState({ aberto: false, tipo: '', mensagem: '' });

  // --- MÁSCARAS DE INPUT ---
  const maskCpfCnpj = (value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, "$1.$2.$3-$4");
    }
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, "$1.$2.$3/$4-$5");
  };

  const maskTelefone = (value) => {
    const digits = value.replace(/\D/g, "");
    return digits.replace(/(\d{2})(\d{5})(\d{4})/g, "($1) $2-$3");
  };

  // --- FUNÇÃO DE CADASTRO ---
  const handleCadastro = async (e) => {
    e.preventDefault();
    if (carregando) return;

    // Validações Básicas
    if (!nome || !cpf || !telefone || !email || !senha) {
      return setModalFeedback({ aberto: true, tipo: 'erro', mensagem: 'Preencha todos os campos obrigatórios!' });
    }

    if (tipoUsuario === 'entregador' && (!cnhFile || !crvFile)) {
      return setModalFeedback({ aberto: true, tipo: 'erro', mensagem: 'Motoristas precisam anexar a foto da CNH e do CRV!' });
    }

    setCarregando(true);

    try {
      // 1. Verificar se o CPF já existe
      const q = query(collection(db, "usuarios"), where("cpf", "==", cpf.replace(/\D/g, "")));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setCarregando(false);
        return setModalFeedback({ aberto: true, tipo: 'erro', mensagem: 'Este CPF/CNPJ já está cadastrado em nosso sistema!' });
      }

      // 2. Criar Usuário no Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      let cnhUrl = "";
      let crvUrl = "";

      // 3. Upload de Documentos (Se for entregador)
      if (tipoUsuario === 'entregador') {
        const cnhRef = ref(storage, `documentos_entregadores/${user.uid}/cnh.jpg`);
        const crvRef = ref(storage, `documentos_entregadores/${user.uid}/crv.jpg`);

        await uploadBytes(cnhRef, cnhFile);
        cnhUrl = await getDownloadURL(cnhRef);

        await uploadBytes(crvRef, crvFile);
        crvUrl = await getDownloadURL(crvRef);
      }

      // 4. Salvar no Firestore
      const dadosUsuario = {
        uid: user.uid,
        nome,
        cpf: cpf.replace(/\D/g, ""),
        telefone: telefone.replace(/\D/g, ""),
        email,
        tipo: tipoUsuario,
        aprovado: tipoUsuario === 'cliente',
        status_aprovacao: tipoUsuario === 'entregador' ? 'pendente' : 'aprovado',
        dataCriacao: new Date()
      };

      if (tipoUsuario === 'entregador') {
        dadosUsuario.cnh_url = cnhUrl;
        dadosUsuario.crv_url = crvUrl;
        dadosUsuario.status_aprovacao = "pendente";
      }

      await setDoc(doc(db, "usuarios", user.uid), dadosUsuario);

      // Sucesso! Mostra o modal verde e depois redireciona
      setModalFeedback({ 
        aberto: true, 
        tipo: 'sucesso', 
        mensagem: tipoUsuario === 'entregador' 
          ? 'Cadastro realizado! Seus documentos estão em análise. Faça login para acompanhar.' 
          : 'Conta criada com sucesso! Você já pode acessar o sistema.' 
      });

    } catch (error) {
      console.error("Erro detalhado:", error.code, error.message);

      let mensagemPersonalizada = "Erro ao realizar cadastro. Tente novamente.";
      switch (error.code) {
        case 'auth/email-already-in-use':
          mensagemPersonalizada = "Este e-mail já está em uso por outra conta. Tente fazer login.";
          break;
        case 'auth/invalid-email':
          mensagemPersonalizada = "O formato do e-mail digitado é inválido.";
          break;
        case 'auth/weak-password':
          mensagemPersonalizada = "Sua senha é muito fraca. Digite pelo menos 6 caracteres.";
          break;
        case 'auth/network-request-failed':
          mensagemPersonalizada = "Falha na conexão. Verifique sua internet e tente novamente.";
          break;
        default:
          mensagemPersonalizada = "Erro: " + error.message;
      }
      setModalFeedback({ aberto: true, tipo: 'erro', mensagem: mensagemPersonalizada });
    } finally {
      setCarregando(false);
    }
  };

  const fecharModal = () => {
    if (modalFeedback.tipo === 'sucesso') {
      navigate('/login');
    } else {
      setModalFeedback({ ...modalFeedback, aberto: false });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
      
      {/* Efeitos de Luz no Fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl transform scale-105"></div>
        <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl transform scale-110"></div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-lg">
        
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 mb-6 shadow-lg shadow-orange-500/20">
            <span className="text-white font-black text-3xl italic">F</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Crie sua conta
          </h1>
          <p className="text-slate-400">Junte-se à Flash Entregas.Br</p>
        </div>

        {/* Formulário */}
        <div className="bg-slate-900/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl">
          
          {/* Seletor Moderno Cliente/Entregador */}
          <div className="flex p-1 bg-slate-950/50 rounded-xl mb-8 border border-slate-800">
            <button 
              type="button" 
              onClick={() => setTipoUsuario('cliente')} 
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tipoUsuario === 'cliente' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sou Cliente
            </button>
            <button 
              type="button" 
              onClick={() => setTipoUsuario('entregador')} 
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${tipoUsuario === 'entregador' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Sou Motorista
            </button>
          </div>

          <form onSubmit={handleCadastro} className="space-y-4">
            
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Nome Completo ou Empresa" 
                className="w-full bg-slate-950/50 text-white px-4 py-3.5 rounded-xl border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all placeholder:text-slate-600" 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="CPF ou CNPJ" 
                  className="w-full bg-slate-950/50 text-white px-4 py-3.5 rounded-xl border border-slate-800 focus:border-orange-500 outline-none transition-all placeholder:text-slate-600" 
                  value={cpf} 
                  onChange={(e) => setCpf(maskCpfCnpj(e.target.value))} 
                  maxLength={18} 
                />
                <input 
                  type="text" 
                  placeholder="Telefone (WhatsApp)" 
                  className="w-full bg-slate-950/50 text-white px-4 py-3.5 rounded-xl border border-slate-800 focus:border-orange-500 outline-none transition-all placeholder:text-slate-600" 
                  value={telefone} 
                  onChange={(e) => setTelefone(maskTelefone(e.target.value))} 
                  maxLength={15} 
                />
              </div>

              <input 
                type="email" 
                placeholder="E-mail" 
                className="w-full bg-slate-950/50 text-white px-4 py-3.5 rounded-xl border border-slate-800 focus:border-orange-500 outline-none transition-all placeholder:text-slate-600" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />

              <input 
                type="password" 
                placeholder="Crie uma Senha (mín. 6 caracteres)" 
                className="w-full bg-slate-950/50 text-white px-4 py-3.5 rounded-xl border border-slate-800 focus:border-orange-500 outline-none transition-all placeholder:text-slate-600" 
                value={senha} 
                onChange={(e) => setSenha(e.target.value)} 
              />
            </div>

            {/* BOX ANEXOS DO MOTORISTA */}
            {tipoUsuario === 'entregador' && (
              <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/20 mt-6 space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Documentos do Veículo e CNH</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CNH */}
                  <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${cnhFile ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 hover:border-blue-500 bg-slate-950/50'}`}>
                    <span className="text-2xl mb-2">{cnhFile ? '✅' : '🪪'}</span>
                    <span className="text-xs font-medium text-center text-slate-300">
                      {cnhFile ? cnhFile.name.substring(0, 15) + "..." : "Foto da CNH"}
                    </span>
                    <input type="file" accept="image/*" onChange={(e) => setCnhFile(e.target.files[0])} className="hidden" />
                  </label>

                  {/* CRV */}
                  <label className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${crvFile ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 hover:border-blue-500 bg-slate-950/50'}`}>
                    <span className="text-2xl mb-2">{crvFile ? '✅' : '📄'}</span>
                    <span className="text-xs font-medium text-center text-slate-300">
                      {crvFile ? crvFile.name.substring(0, 15) + "..." : "Documento (CRV)"}
                    </span>
                    <input type="file" accept="image/*" onChange={(e) => setCrvFile(e.target.files[0])} className="hidden" />
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 text-center italic mt-2">Formatos: JPG, PNG. Fotos legíveis por favor.</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={carregando} 
              className={`w-full mt-6 flex items-center justify-center font-bold text-white py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 ${tipoUsuario === 'entregador' ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25' : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-500/25'}`}
            >
              {carregando ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processando...
                </span>
              ) : "Criar minha conta"}
            </button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-slate-800">
            <span className="text-slate-500 text-sm">Já possui uma conta? </span>
            <Link to="/login" className="text-orange-400 font-medium text-sm hover:text-orange-300 transition-colors">
              Fazer login
            </Link>
          </div>
        </div>

      </div>

      {/* --- MODAL DE FEEDBACK (MENSAGENS DE ERRO E SUCESSO) --- */}
      {modalFeedback.aberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className={`bg-slate-900 border w-full max-w-sm rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center ${modalFeedback.tipo === 'sucesso' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${modalFeedback.tipo === 'sucesso' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              {modalFeedback.tipo === 'sucesso' ? (
                <span className="text-3xl">✅</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              )}
            </div>

            <h2 className="text-white font-bold text-xl mb-2">
              {modalFeedback.tipo === 'sucesso' ? 'Tudo certo!' : 'Atenção'}
            </h2>
            
            <p className="text-slate-400 text-sm mb-8">{modalFeedback.mensagem}</p>
            
            <button 
              onClick={fecharModal}
              className={`w-full text-white py-3 rounded-xl font-medium transition-colors ${modalFeedback.tipo === 'sucesso' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {modalFeedback.tipo === 'sucesso' ? 'Ir para o Login' : 'OK, entendi'}
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
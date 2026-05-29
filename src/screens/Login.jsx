import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail // <-- Adicionado para o reset de senha
} from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false); 
  const navigate = useNavigate();
  
  // Estados para a Recuperação de Senha
  const [modalRecuperarSenha, setModalRecuperarSenha] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [enviandoReset, setEnviandoReset] = useState(false);

  const [modalFeedback, setModalFeedback] = useState({ aberto: false, tipo: '', mensagem: '' });

  async function loginComGoogle() {
    const provider = new GoogleAuthProvider();
    setCarregando(true);
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "usuarios", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        nome: user.displayName || "Usuário Google",
        email: user.email,
        cpf: "", // Fica vazio para ele completar depois, se quiser
        telefone: user.phoneNumber || "",
        tipo: 'cliente', // Default solicitado
        aprovado: true,
        status_aprovacao: 'aprovado',
        dataCriacao: new Date()
      });
    }

      localStorage.clear();
      sessionStorage.clear();
      navigate('/principal');

    } catch (error) {
      console.error("Erro no login Google:", error);
      setModalFeedback({ 
        aberto: true, 
        tipo: 'erro', 
        mensagem: 'Não foi possível completar o login com Google.' 
      });
    } finally {
      setCarregando(false);
    }
  }

  // === ESTADO PARA OS VALORES DA CORRIDA ===
  const [valoresConfig, setValoresConfig] = useState({
    taxaMinima: 12.00,
    kmMinimo: 3,
    valorKmAdicional: 1.80
  });

  // === BUSCAR CONFIGURAÇÕES EM TEMPO REAL ===
  useEffect(() => {
    const docRef = doc(db, "configuracoes", "valores_corrida");
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setValoresConfig(docSnap.data());
      }
    }, (error) => {
      console.error("Erro no Firebase (provavelmente permissão):", error);
    });

    return () => unsubscribe();
  }, []);

  async function fazerLogin(e) {
    e.preventDefault();
    if (!email || !senha) {
      setModalFeedback({ aberto: true, tipo: 'erro', mensagem: 'Preencha e-mail e senha!' });
      return;
    }

    setCarregando(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      localStorage.clear();
      sessionStorage.clear();
      navigate('/principal'); 
    } catch (error) {
      setModalFeedback({ aberto: true, tipo: 'erro', mensagem: 'E-mail ou senha incorretos. Tente novamente.' });
    } finally {
      setCarregando(false);
    }
  }

  // === FUNÇÃO DE RECUPERAR SENHA ===
  async function handleRecuperarSenha(e) {
    e.preventDefault();
    if (!emailRecuperacao) {
      setModalFeedback({ aberto: true, tipo: 'erro', mensagem: 'Digite seu e-mail para recuperar a senha!' });
      return;
    }

    setEnviandoReset(true);
    try {
      await sendPasswordResetEmail(auth, emailRecuperacao);
      setModalRecuperarSenha(false);
      setModalFeedback({ 
        aberto: true, 
        tipo: 'sucesso', 
        mensagem: 'E-mail de recuperação enviado! Verifique sua caixa de entrada e a pasta de spam.' 
      });
      setEmailRecuperacao('');
    } catch (error) {
      console.error("Erro ao recuperar senha:", error);
      setModalFeedback({ 
        aberto: true, 
        tipo: 'erro', 
        mensagem: 'Erro ao enviar o e-mail. Verifique se o endereço está correto e cadastrado.' 
      });
    } finally {
      setEnviandoReset(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
      
      {/* Efeitos de Luz no Fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl transform scale-105"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl transform scale-110"></div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md">
        
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-50 h-21 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 mb-6 shadow-lg shadow-orange-500/20">
            <span className="text-white font-black text-3xl italic">Flash Entregas.Br</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Bem-vindo de volta!
          </h1>
          <p className="text-slate-400">Acesse sua conta para pedir entregas.</p>
        </div>

        {/* Formulário */}
        <form onSubmit={fazerLogin} className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl">
          
          <div className="space-y-5">
            <div>
              <label className="text-slate-300 text-sm font-medium mb-1.5 block">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 text-white pl-11 pr-4 py-3.5 rounded-xl border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-300 text-sm font-medium block">Senha</label>
                <button 
                  type="button" 
                  onClick={() => { setEmailRecuperacao(email); setModalRecuperarSenha(true); }} 
                  className="text-sm text-orange-400 hover:text-orange-300 transition-colors font-medium"
                >
                  Esqueceu a Senha?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input 
                  type="password" 
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-slate-950/50 text-white pl-11 pr-4 py-3.5 rounded-xl border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={carregando}
            className="w-full mt-8 flex items-center justify-center font-medium bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3.5 rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 disabled:opacity-50"
          >
            {carregando ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Entrando...
              </span>
            ) : "Entrar na plataforma"}
          </button>
          <button 
            type="button"
            onClick={loginComGoogle}
            className="w-full mt-4 flex items-center justify-center gap-3 font-medium bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-xl border border-slate-700 transition-all shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.64 0 3.11.56 4.27 1.67l3.19-3.19C17.51 1.65 14.96 1 12 1 7.42 1 3.5 3.64 1.5 7.49l3.75 2.91C6.12 7.15 8.84 5.04 12 5.04z"/>
              <path fill="#FBBC05" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31l3.45 2.68c2.01-1.85 3.4-4.58 3.4-7.74z"/>
              <path fill="#34A853" d="M12 23c3.04 0 5.59-1.01 7.46-2.74l-3.45-2.68c-1.03.7-2.34 1.11-4.01 1.11-3.1 0-5.74-2.1-6.73-4.93l-3.75 2.91C3.5 20.36 7.42 23 12 23z"/>
              <path fill="#4285F4" d="M5.27 13.76c-.25-.74-.39-1.53-.39-2.35s.14-1.61.39-2.35L1.52 6.15C.55 8.08 0 10.23 0 12.5s.55 4.42 1.52 6.35l3.75-3.09z"/>
            </svg>
            Entrar com Google
          </button>

          <div className="text-center mt-6">
            <span className="text-slate-500 text-sm">Novo por aqui? </span>
            <Link to="/cadastro" className="text-orange-400 font-medium text-sm hover:text-orange-300 transition-colors">
              Crie sua conta agora
            </Link>
          </div>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => navigate('/')} className="text-slate-500 text-sm hover:text-slate-300 transition-colors flex items-center gap-2 justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
            Voltar para a página inicial
          </button>
        </div>
      </div>

      {/* --- BOTÃO INFORMATIVO NO RODAPÉ --- */}
      <button 
        type="button"
        onClick={() => setModalAberto(true)}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-orange-500/30 text-orange-400 px-5 py-2 rounded-full font-medium text-sm hover:bg-orange-500/10 transition-all shadow-lg flex items-center gap-2 z-20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
        Sobre e Tarifas
      </button>

      {/* --- MODAL SOBREPOSTO (SOBRE NÓS) --- */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <span className="text-white font-black italic text-sm">F</span>
                </div>
                <h2 className="text-white font-bold text-lg">Flash Entregas</h2>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
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

              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 p-4 rounded-2xl">
                <h3 className="text-green-400 font-bold text-sm uppercase mb-1">💳 Flash Carteira</h3>
                <p className="text-slate-400 text-xs">Saldo pré-pago: peça entregas com um clique sem precisar de troco ou Pix na hora.</p>
              </div>
            </div>

            <button 
              onClick={() => setModalAberto(false)}
              className="w-full mt-8 bg-slate-800 text-white py-3 rounded-xl font-medium hover:bg-slate-700 transition-all border border-slate-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL DE RECUPERAR SENHA --- */}
      {modalRecuperarSenha && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[150]">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Recuperar Senha</h3>
            <p className="text-slate-400 text-sm mb-6">Digite o seu e-mail cadastrado e enviaremos um link para você redefinir sua senha.</p>

            <form onSubmit={handleRecuperarSenha}>
              <div className="mb-6">
                <label className="text-slate-300 text-sm font-medium mb-1.5 block">E-mail</label>
                <input
                  type="email"
                  value={emailRecuperacao}
                  onChange={(e) => setEmailRecuperacao(e.target.value)}
                  className="w-full bg-slate-950/50 text-white px-4 py-3 rounded-xl border border-slate-800 focus:border-orange-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalRecuperarSenha(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoReset}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-xl font-medium transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50"
                >
                  {enviandoReset ? "Enviando..." : "Enviar Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE FEEDBACK (MENSAGENS DE ERRO/SUCESSO) --- */}
      {modalFeedback.aberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className={`bg-slate-900 border w-full max-w-sm rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center ${modalFeedback.tipo === 'sucesso' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${modalFeedback.tipo === 'sucesso' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              {modalFeedback.tipo === 'sucesso' ? (
                <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              )}
            </div>
            <h2 className="text-white font-bold text-xl mb-2">
              {modalFeedback.tipo === 'sucesso' ? 'Sucesso!' : 'Atenção'}
            </h2>
            <p className="text-slate-400 text-sm mb-8">{modalFeedback.mensagem}</p>
            <button 
              onClick={() => setModalFeedback({ ...modalFeedback, aberto: false })}
              className={`w-full text-white py-3 rounded-xl font-medium transition-colors ${modalFeedback.tipo === 'sucesso' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
            >
              OK, entendi
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
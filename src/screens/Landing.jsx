import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen font-sans">
      {/* SEÇÃO HERO (Cabeçalho) */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Efeitos de Luz no Fundo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl transform scale-105"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl transform scale-110"></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Textos da Esquerda */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/80 border border-orange-500/20 mb-8">
                <span className="text-white font-black text-3xl italic">Flash Entregas.Br</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Seu tempo é <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">valioso</span>
              </h1>
              
              <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                Não deixe que entregas atrasadas prejudiquem seus negócios. Conheça o <span className="text-white font-semibold">Flash Entregas.Br</span>: agilidade e confiança ao seu alcance.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center gap-2 font-medium bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 hover:scale-105"
                >
                  Pedir Agora
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 w-5 h-5">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
                <button 
                  onClick={() => navigate('/carteira')}
                  className="inline-flex items-center justify-center gap-2 font-medium transition-colors border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-4 text-lg rounded-xl"
                >
                  Minha Carteira
                </button>
              </div>

              {/*<div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-slate-800">
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-white">15min</div>
                  <div className="text-slate-500 text-sm mt-1">Tempo médio</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-white">99%</div>
                  <div className="text-slate-500 text-sm mt-1">No prazo</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-white">24/7</div>
                  <div className="text-slate-500 text-sm mt-1">Disponibilidade</div>
                </div>
              </div>*/}
            </div>

            {/* Imagem/Card da Direita (Mockup) */}
            <div className="relative hidden lg:block">
              <div className="relative w-full aspect-square">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-72 h-[580px] bg-slate-800 rounded-[3rem] p-3 shadow-2xl">
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-900 rounded-full z-20"></div>
                    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 rounded-[2.5rem] overflow-hidden relative z-10">
                      <div className="p-6 h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-8 mt-6">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                            <span className="text-white font-black italic">F</span>
                          </div>
                          <span className="text-white font-bold text-lg italic">Flash Entregas.Br</span>
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          <div className="bg-slate-800/50 rounded-2xl p-4">
                            <div className="text-slate-400 text-xs mb-2">Status do Pedido</div>
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                              <span className="text-white font-medium">A caminho da Coleta</span>
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-2xl p-4">
                            <div className="text-slate-400 text-xs mb-2">Tempo estimado</div>
                            <div className="text-2xl font-bold text-orange-400">8 min</div>
                          </div>
                          <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-2xl p-4 border border-orange-500/30">
                            <div className="flex items-center gap-2 text-orange-400">
                              <span className="text-sm font-bold">🚀 Entrega expressa ativa</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Float Card Notification */}
                <div className="absolute top-10 right-0 bg-slate-800 rounded-2xl p-4 shadow-xl z-30 animate-bounce">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-400 text-lg">✓</span>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">Pedido Aceito</div>
                      <div className="text-slate-400 text-xs">Motorista a caminho</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SEÇÃO QUEM SOMOS */}
      <section className="py-24 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,165,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,165,0,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Esquerda */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
                Logística rápida na <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Zona Sul</span> de Joinville
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed mb-6">
                Especialistas em logística rápida na Zona Sul de Joinville. A Flash Entregas.Br nasceu para conectar os bairros da <span className="text-white font-semibold">zona sul</span> a toda a cidade com confiança e o melhor custo-benefício.
              </p>
              <p className="text-slate-500 leading-relaxed">
                Somos o parceiro ideal para empresas e autônomos que precisam de agilidade, pontualidade e um serviço confiável no dia a dia.
              </p>
            </div>

            {/* Direita - Cards de Vantagens */}
            <div className="space-y-4">
              <div className="flex items-start gap-5 p-5 rounded-2xl border border-orange-500/20 bg-orange-500/10">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0 text-2xl">⚡</div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Rapidez</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Tempo médio de 15 minutos. Coleta agilizada para o seu pedido sair na hora.</p>
                </div>
              </div>
              <div className="flex items-start gap-5 p-5 rounded-2xl border border-green-500/20 bg-green-500/10">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0 text-2xl">🛡️</div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Confiança</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">99% das entregas no prazo. Sua mercadoria em boas mãos com quem conhece Joinville.</p>
                </div>
              </div>
              {/*<div className="flex items-start gap-5 p-5 rounded-2xl border border-blue-500/20 bg-blue-500/10">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-2xl">🕒</div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Disponibilidade</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Operação 24h para sua empresa. Qualquer hora, qualquer dia da semana.</p>
                </div>
              </div>*/}
              <div className="flex items-start gap-5 p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0 text-2xl">💰</div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">Preço Justo</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Sem surpresas no fechamento. Cobrança transparente baseada em KM.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SEÇÃO COMO FUNCIONA */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-orange-500 font-bold text-sm uppercase tracking-wider">Como funciona</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-6">
              Simples, rápido e <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">eficiente</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">Em apenas 4 passos, sua entrega está garantida com toda a qualidade que você precisa.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div className="relative group bg-white rounded-3xl p-8 border border-slate-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-lg">1</div>
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-3xl">📱</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Acesse o Portal</h3>
              <p className="text-slate-600 leading-relaxed">Faça login no nosso sistema de qualquer celular ou computador.</p>
            </div>

            <div className="relative group bg-white rounded-3xl p-8 border border-slate-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-lg">2</div>
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6 text-3xl">📍</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Solicite a Coleta</h3>
              <p className="text-slate-600 leading-relaxed">Digite os endereços e veja o valor da entrega instantaneamente.</p>
            </div>

            <div className="relative group bg-white rounded-3xl p-8 border border-slate-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-lg">3</div>
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6 text-3xl">🏍️</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Acompanhe</h3>
              <p className="text-slate-600 leading-relaxed">Nosso motorista aceita a corrida e vai direto até você.</p>
            </div>

            <div className="relative group bg-white rounded-3xl p-8 border border-slate-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-lg">4</div>
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 text-3xl">📦</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Entrega Feita</h3>
              <p className="text-slate-600 leading-relaxed">Cliente feliz, encomenda entregue, e o pagamento seguro.</p>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 py-8 border-t border-slate-900 text-center">
        <p className="text-slate-500 text-sm">© 2026 Flash Entregas.Br. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
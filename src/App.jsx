import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import Login from './screens/Login';
import Cadastro from './screens/Cadastro';
import Principal from './screens/Principal';
import Motorista from './screens/Motorista';
import Landing from './screens/Landing';
import Carteira from './screens/Carteira'; 
import Sucesso from './screens/Sucesso';
import Perfil from './screens/Perfil';

import Admin from './screens/Admin';
import AdminValores from './screens/AdminValores'; 
import AdminCredito from './screens/AdminCredito'; 
import AdminGerenciarPedidos from './screens/AdminGerenciarPedidos'; 
import TabelaPrecos from './screens/TabelaPrecos';
import SolicitacoesResgate from './screens/SolicitacoesResgate';

import ProtectedRoute from './components/ProtectedRoute'; // O Leão de chácara simples
import RoleProtectedRoute from './components/RoleProtectedRoute'; // O Gerente de Segurança (NOVO)

function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregando(false);
    }, (error) => {
      console.error("Erro no Firebase:", error);
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF8C00]"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* === PÚBLICAS === */}
        <Route path="/" element={<Landing />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/login" element={!usuario ? <Login /> : <Navigate to="/principal" />} />
        
        {/* === PRIVADAS GERAIS (O Leão de chácara simples resolve) === */}
        {/* Se tem login (usuario), entra. Não importa o cargo. */}
        <Route path="/principal" element={<ProtectedRoute user={usuario}><Principal /></ProtectedRoute>} />
        <Route path="/carteira" element={<ProtectedRoute user={usuario}><Carteira /></ProtectedRoute>} />
        <Route path="/sucesso" element={<ProtectedRoute user={usuario}><Sucesso /></ProtectedRoute>} />
        
        {/* 👇 AQUI ESTAVA O ERRO: Perfil agora usa ProtectedRoute igual as rotas acima 👇 */}
        <Route path="/perfil" element={<ProtectedRoute user={usuario}><Perfil /></ProtectedRoute>} />
        
        {/* === PRIVADAS RESTRITAS (O Gerente de Segurança atua aqui!) === */}
        
        {/* Só Motorista, Entregador e Admin entram aqui */}
        <Route path="/motorista" element={
          <RoleProtectedRoute user={usuario} allowedRoles={['motorista', 'entregador', 'admin']}>
            <Motorista />
          </RoleProtectedRoute>
        } />

        {/* Só o Dono/Admin entra no Painel Principal */}
        <Route path="/admin" element={
          <RoleProtectedRoute user={usuario} allowedRoles={['admin']}>
            <Admin />
          </RoleProtectedRoute>
        } />

        <Route path="/admin/valores" element={
          <RoleProtectedRoute user={usuario} allowedRoles={['admin']}>
            <AdminValores />
          </RoleProtectedRoute>
        } />

        <Route path="/admin/credito" element={
          <RoleProtectedRoute user={usuario} allowedRoles={['admin']}>
            <AdminCredito />
          </RoleProtectedRoute>
        } />

        <Route path="/admin/pedidos" element={
          <RoleProtectedRoute user={usuario} allowedRoles={['admin']}>
            <AdminGerenciarPedidos />
          </RoleProtectedRoute>
        } />

        <Route path="/admin/tabela-precos" element={
          <RoleProtectedRoute user={usuario} allowedRoles={['admin']}>
            <TabelaPrecos />
          </RoleProtectedRoute>
        } />

        <Route path="/admin/saques" element={
          <RoleProtectedRoute user={usuario} allowedRoles={['admin']}>
            <SolicitacoesResgate />
          </RoleProtectedRoute>
        } />

        {/* Rota Coringa SEMPRE no final: Digitou besteira, volta pro login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
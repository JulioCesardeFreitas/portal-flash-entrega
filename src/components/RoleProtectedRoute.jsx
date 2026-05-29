import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Ajuste o caminho se a sua pasta firebase ficar em outro lugar

export default function RoleProtectedRoute({ user, allowedRoles, children }) {
  const [roleLoading, setRoleLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function checkRole() {
      // Se nem usuário tem, não precisa nem buscar no banco
      if (!user) {
        setRoleLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'usuarios', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          const userRole = userData.tipo || 'cliente'; // Se não tiver nada, assume que é cliente

          // Verifica se o cargo do usuário está na "Lista VIP" (allowedRoles)
          if (allowedRoles.includes(userRole)) {
            setHasAccess(true);
          }
        }
      } catch (error) {
        console.error("Erro ao checar permissão da rota:", error);
      } finally {
        setRoleLoading(false);
      }
    }

    checkRole();
  }, [user, allowedRoles]);

  // 1. Se não estiver logado, chuta para o Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Enquanto vai no banco ler o perfil, mostra tela de carregamento
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
        <p className="text-slate-500 mt-4 text-sm animate-pulse">Verificando credenciais...</p>
      </div>
    );
  }

  // 3. Se terminou de carregar e NÃO TEM acesso, chuta pro Principal
  if (!hasAccess) {
    return <Navigate to="/principal" replace />;
  }

  // 4. Se passou por tudo (Logado + Cargo Certo), APROVADO! Mostra a tela.
  return children;
}
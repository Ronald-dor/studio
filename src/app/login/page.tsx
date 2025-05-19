
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shirt, User, Lock, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { app } from '@/lib/firebase'; // Garanta que app seja exportado de firebase.ts

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();
  
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const auth = getAuth(app);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/');
      } else {
        setAuthChecked(true);
      }
    });
    return () => unsubscribe();
  }, [router, auth]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login Bem-sucedido!",
        description: "Redirecionando para o painel...",
      });
      // O onAuthStateChanged cuidará do redirecionamento
    } catch (err: any) {
      let friendlyMessage = "Ocorreu um erro desconhecido.";
      switch (err.code) {
        case 'auth/invalid-email':
          friendlyMessage = "O formato do email é inválido.";
          break;
        case 'auth/user-disabled':
          friendlyMessage = "Este usuário foi desabilitado.";
          break;
        case 'auth/user-not-found':
          friendlyMessage = "Usuário não encontrado. Verifique o email.";
          break;
        case 'auth/wrong-password':
          friendlyMessage = "Senha incorreta.";
          break;
        case 'auth/invalid-credential':
            friendlyMessage = "Credenciais inválidas. Verifique seu email e senha.";
            break;
        default:
          console.error("Firebase login error:", err);
          friendlyMessage = "Falha no login. Verifique suas credenciais.";
      }
      setError(friendlyMessage);
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description: friendlyMessage,
      });
    }
  };

  if (!authChecked) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">Verificando autenticação...</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4" suppressHydrationWarning={true}>
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center space-y-4 pt-8">
          <Shirt size={48} className="mx-auto text-primary" />
          <CardTitle className="text-2xl font-bold">
            TieTrack Login
          </CardTitle>
          <CardDescription>Acesse seu inventário de gravatas.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-6 px-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 text-base md:text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 text-base md:text-sm"
                />
              </div>
            </div>
            {error && <p className="text-sm font-medium text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" variant="default">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <footer className="py-8 text-center text-sm text-muted-foreground">
        © {currentYear || new Date().getFullYear()} TieTrack. Todos os direitos reservados.
      </footer>
    </div>
  );
}

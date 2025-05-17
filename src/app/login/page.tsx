
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shirt, User, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const USERNAME = "Rsgravataria";
const PASSWORD = "Confioemvoce";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    // This effect runs only on the client after mount
    setCurrentYear(new Date().getFullYear());
    const auth = localStorage.getItem('tieTrackAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      router.push('/');
    } else {
      setIsAuthenticated(false);
    }
  }, [router]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (username === USERNAME && password === PASSWORD) {
      localStorage.setItem('tieTrackAuth', 'true');
      toast({
        title: "Login Bem-sucedido!",
        description: "Redirecionando para o painel...",
      });
      setIsAuthenticated(true); // Set state to trigger re-render for redirect
      router.push('/'); 
    } else {
      setError("Nome de usuário ou senha inválidos.");
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description: "Verifique seu nome de usuário e senha.",
      });
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  
  if (isAuthenticated === true) {
     // This state is usually brief as the router.push in useEffect handles the redirect
     return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    );
  }

  // Only render form if isAuthenticated is false
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
              <Label htmlFor="username">Nome de Usuário</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Nome de Usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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

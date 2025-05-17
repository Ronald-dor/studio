"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Shirt, LogIn } from 'lucide-react'; // LogIn icon
import { useToast } from '@/hooks/use-toast';

const USERNAME = "Rsgravataria";
const PASSWORD = "Confioemvoce";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();
  
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');


  useEffect(() => {
    setCurrentYear(new Date().getFullYear()); // Set year on client
    
    const storedAuth = localStorage.getItem('tieTrackAuth');
    if (storedAuth === 'true') {
      setAuthStatus('authenticated');
    } else {
      setAuthStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      router.push('/');
    }
  }, [authStatus, router]);


  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (username === USERNAME && password === PASSWORD) {
      localStorage.setItem('tieTrackAuth', 'true');
      toast({
        title: "Login Bem-sucedido!",
        description: "Redirecionando para o painel...",
      });
      setAuthStatus('authenticated'); // This will trigger the redirect effect
    } else {
      setError("Nome de usuário ou senha inválidos.");
      toast({
        variant: "destructive",
        title: "Falha no Login",
        description: "Verifique seu nome de usuário e senha.",
      });
    }
  };

  if (authStatus === 'checking') {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">Verificando autenticação...</p>
      </div>
    );
  }
  
  if (authStatus === 'authenticated') {
     return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4" suppressHydrationWarning={true}>
      <header className="absolute top-0 left-0 right-0 py-6 px-4 md:px-8">
        <div className="container mx-auto flex items-center space-x-2">
          <Shirt size={32} className="text-primary" />
          <h1 className="text-3xl font-bold text-primary">TieTrack</h1>
        </div>
      </header>
      
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center">
            <LogIn size={24} className="mr-2 text-primary"/> Acessar TieTrack
          </CardTitle>
          <CardDescription>Entre com suas credenciais para gerenciar seu inventário.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Nome de Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="Nome de Usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="text-base md:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-base md:text-sm"
              />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full" variant="default">
              Entrar
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground">
          <p>Lembre-se: Nome de usuário é <strong>Rsgravataria</strong> e senha é <strong>Confioemvoce</strong>.</p>
        </CardFooter>
      </Card>

      <footer className="absolute bottom-0 left-0 right-0 py-6 text-center text-sm text-muted-foreground">
        © {currentYear || new Date().getFullYear()} TieTrack. Mantenha sua coleção organizada.
      </footer>
    </div>
  );
}

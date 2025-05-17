
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shirt, User, Lock } from 'lucide-react'; // Import User and Lock icons

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (isClient) {
      const isAuthenticated = localStorage.getItem('tieTrackAuthenticated') === 'true';
      if (isAuthenticated) {
        router.replace('/');
      }
    }
  }, [isClient, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Credenciais hardcoded
    if (username === 'Rsgravataria' && password === 'Confioemvoce') {
      localStorage.setItem('tieTrackAuthenticated', 'true');
      toast({
        title: 'Login bem-sucedido!',
        description: 'Bem-vindo de volta!',
      });
      router.push('/');
    } else {
      toast({
        variant: 'destructive',
        title: 'Falha no Login',
        description: 'Nome de usuário ou senha incorretos.',
      });
    }
  };

  if (isClient && localStorage.getItem('tieTrackAuthenticated') === 'true') {
    // Still show a loading/redirecting state while router.replace in useEffect is processing
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <Shirt size={64} className="text-primary mb-6" />
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shirt size={48} className="text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">TieTrack Login</CardTitle>
          <CardDescription>Acesse seu inventário de gravatas.</CardDescription>
        </CardHeader>
        <CardContent>
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
                  className="pl-10"
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
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" variant="default">
              Entrar
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground mt-4">
          <p>&copy; {currentYear || new Date().getFullYear()} TieTrack. Todos os direitos reservados.</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;

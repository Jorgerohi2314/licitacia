"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserInfo } from "@/components/userInfo"
import { ProtectedContent } from "@/components/protected-content"
import { Shell } from "@/components/layout/shell"
import { ThemeToggle } from "@/components/themeToggle"

export default function Home() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse text-lg font-medium">Cargando...</div>
      </div>
    )
  }

  if (session) {
    // Redirect to dashboard page
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Landing Header */}
      <header className="border-b bg-background/70 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
              L
            </div>
            <h1 className="text-xl font-bold tracking-tight">LicitacIA</h1>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => (window.location.href = "/dashboard")}>
              Buscar Licitaciones
            </Button>
            <Button variant="ghost" onClick={() => (window.location.href = "/auth/signin")}>
              Iniciar Sesión
            </Button>
            <Button onClick={() => (window.location.href = "/auth/signup")}>
              Registrarse
            </Button>
          </div>
        </div>
      </header>

      {/* Landing Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-8 bg-radial-[at_50%_0%] from-primary/10 to-transparent">
        <div className="space-y-4 max-w-3xl">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight lg:text-7xl">
            Licitaciones Públicas <br />
            <span className="text-primary">Inteligentes</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-[42rem] mx-auto">
            Recibe avisos personalizados, analiza pliegos con IA y no pierdas ninguna oportunidad de negocio con la administración pública.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" className="text-lg px-8 h-12" onClick={() => (window.location.href = "/auth/signup")}>
            Empezar Gratis
          </Button>
          <Button size="lg" variant="outline" className="text-lg px-8 h-12">
            Saber más
          </Button>
        </div>

        {/* Feature Cards Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-5xl text-left">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Alertas en Tiempo Real</CardTitle>
              <CardDescription>Notificaciones instantáneas de nuevas licitaciones.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Análisis con IA</CardTitle>
              <CardDescription>Resúmenes automáticos de pliegos complejos.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Gestión Centralizada</CardTitle>
              <CardDescription>Todo tu flujo de trabajo en un solo lugar.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground bg-muted/30">
        <div className="container mx-auto">
          © {new Date().getFullYear()} LicitacIA — Potenciando tu negocio con datos públicos.
        </div>
      </footer>
    </div>
  )
}

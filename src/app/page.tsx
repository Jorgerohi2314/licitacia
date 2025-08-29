"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserInfo } from "@/components/userInfo"
import { ProtectedContent } from "@/components/protected-content"

export default function Home() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse text-lg font-medium">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/70 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo + título */}
          <div className="flex items-center space-x-3">
            <img src="/favicon.ico" alt="Z.ai Logo" className="w-8 h-8" />
            <h1 className="text-xl font-bold tracking-tight">Mi App</h1>
          </div>

          {/* Sesión */}
          {session ? (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-muted-foreground">
                👋 Bienvenido, <strong>{session.user?.name}</strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => (window.location.href = "/auth/signin")}>
                Iniciar Sesión
              </Button>
              <Button onClick={() => (window.location.href = "/auth/signup")}>
                Registrarse
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            {session ? (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Tu perfil</CardTitle>
                  <CardDescription>Información de usuario</CardDescription>
                </CardHeader>
                <CardContent>
                  <UserInfo />
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Bienvenido</CardTitle>
                  <CardDescription>
                    Inicia sesión o regístrate para acceder a todas las funcionalidades
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => (window.location.href = "/auth/signin")}
                  >
                    Iniciar Sesión
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => (window.location.href = "/auth/signup")}
                  >
                    Crear Cuenta
                  </Button>
                </CardContent>
              </Card>
            )}
          </aside>

          {/* Main Content Area */}
          <section className="lg:col-span-3 space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Panel Principal
                </CardTitle>
                <CardDescription>
                  Aquí encontrarás todo lo importante de tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProtectedContent />
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/70 backdrop-blur-sm py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Mi App — Todos los derechos reservados
      </footer>
    </div>
  )
}

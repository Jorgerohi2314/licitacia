"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function SignInPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        })

        if (result?.error) {
            toast.error("Error al iniciar sesión")
        } else {
            toast.success("Inicio de sesión exitoso")
            router.push("/")
        }
        } catch (error) {
        toast.error("Error al iniciar sesión")
        } finally {
        setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
                Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-center">
                Ingresa tu correo y contraseña para acceder
            </CardDescription>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                </div>
                <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                >
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>
            </form>
            <div className="mt-4 text-center text-sm">
                <p className="text-muted-foreground">
                ¿No tienes cuenta?{" "}
                <button
                    onClick={() => router.push("/auth/signup")}
                    className="text-primary hover:underline"
                >
                    Regístrate
                </button>
                </p>
            </div>
            </CardContent>
        </Card>
        </div>
    )
    }
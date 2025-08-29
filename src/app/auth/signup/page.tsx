"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function SignUpPage() {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
        toast.error("Las contraseñas no coinciden")
        return
        }

        setIsLoading(true)

        try {
        // Registrar usuario
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            name,
            email,
            password,
            }),
        })

        if (response.ok) {
            toast.success("Cuenta creada exitosamente")
            
            // Iniciar sesión automáticamente
            const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
            })

            if (result?.error) {
            toast.error("Error al iniciar sesión automáticamente")
            } else {
            router.push("/")
            }
        } else {
            const error = await response.json()
            toast.error(error.message || "Error al crear la cuenta")
        }
        } catch (error) {
        toast.error("Error al crear la cuenta")
        } finally {
        setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
                Crear Cuenta
            </CardTitle>
            <CardDescription className="text-center">
                Completa el formulario para crear tu cuenta
            </CardDescription>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                    id="name"
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                </div>
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
                <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
                </div>
                <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                >
                {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
                </Button>
            </form>
            <div className="mt-4 text-center text-sm">
                <p className="text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <button
                    onClick={() => router.push("/auth/signin")}
                    className="text-primary hover:underline"
                >
                    Inicia sesión
                </button>
                </p>
            </div>
            </CardContent>
        </Card>
        </div>
    )
}
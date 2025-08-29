"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"

export function UserInfo() {
    const { data: session, status } = useSession()
    const [isLoading, setIsLoading] = useState(false)

    const handleSignOut = async () => {
        setIsLoading(true)
        try {
        await signOut({ callbackUrl: "/" })
        toast.success("Sesión cerrada correctamente")
        } catch (error) {
        toast.error("Error al cerrar sesión")
        } finally {
        setIsLoading(false)
        }
    }

    if (status === "loading") {
        return <div>Cargando...</div>
    }

    if (!session) {
        return null
    }

    return (
        <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-3">
            <Avatar>
                <AvatarImage src={session.user?.image || ""} />
                <AvatarFallback>
                {session.user?.name?.charAt(0) || "U"}
                </AvatarFallback>
            </Avatar>
            <div>
                <div className="font-semibold">{session.user?.name}</div>
                <div className="text-sm text-muted-foreground">{session.user?.email}</div>
            </div>
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Estado:</span>
            <Badge variant="secondary">Activo</Badge>
            </div>
            <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleSignOut}
            disabled={isLoading}
            >
            {isLoading ? "Cerrando sesión..." : "Cerrar Sesión"}
            </Button>
        </CardContent>
        </Card>
    )
}
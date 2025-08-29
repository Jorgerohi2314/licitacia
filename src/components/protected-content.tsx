"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SubscriptionPlans } from "./subscriptionPlans"

interface Subscription {
  id: string
  plan: string
  status: string
  startDate: string
  endDate?: string
}

export function ProtectedContent() {
  const { data: session, status } = useSession()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchSubscription()
    }
  }, [session])

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/subscription")
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error("Error al obtener suscripción:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlanChange = (newPlan: string) => {
    fetchSubscription()
  }

  if (status === "loading" || isLoading) {
    return <div>Cargando...</div>
  }

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contenido Protegido</CardTitle>
          <CardDescription>
            Debes iniciar sesión para acceder a este contenido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.href = "/auth/signin"}>
            Iniciar Sesión
          </Button>
        </CardContent>
      </Card>
    )
  }

  const getPlanFeatures = (plan: string) => {
    switch (plan) {
      case "free":
        return [
          "Acceso a contenido básico",
          "Soporte por email",
          "1 proyecto activo"
        ]
      case "premium":
        return [
          "Acceso a contenido premium",
          "Proyectos ilimitados",
          "Soporte prioritario",
          "Análisis avanzado"
        ]
      case "enterprise":
        return [
          "Acceso completo a todas las características",
          "API dedicada",
          "Soporte 24/7",
          "SLA garantizado",
          "Personalización"
        ]
      default:
        return []
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Bienvenido, {session.user?.name}
            <Badge variant={subscription?.status === "active" ? "default" : "secondary"}>
              {subscription?.plan || "free"} - {subscription?.status || "inactive"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {subscription?.status === "active" 
              ? `Tu suscripción ${subscription.plan} está activa`
              : "No tienes una suscripción activa"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Características disponibles:</h3>
              <ul className="space-y-1">
                {getPlanFeatures(subscription?.plan || "free").map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Planes de Suscripción</CardTitle>
          <CardDescription>
            Actualiza tu plan para acceder a más características
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionPlans 
            currentPlan={subscription?.plan} 
            onPlanChange={handlePlanChange}
          />
        </CardContent>
      </Card>
    </div>
  )
}
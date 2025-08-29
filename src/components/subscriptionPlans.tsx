"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface SubscriptionPlansProps {
    currentPlan?: string
    onPlanChange: (plan: string) => void
    }

const plans = [
    {
        id: "free",
        name: "Gratis",
        price: "$0",
        description: "Perfecto para empezar",
        features: [
        "Acceso básico",
        "Soporte por email",
        "1 proyecto activo"
        ],
        popular: false
    },
    {
        id: "premium",
        name: "Premium",
        price: "$9.99",
        period: "/mes",
        description: "Para profesionales",
        features: [
        "Todo lo del plan gratis",
        "Proyectos ilimitados",
        "Soporte prioritario",
        "Análisis avanzado"
        ],
        popular: true
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: "$29.99",
        period: "/mes",
        description: "Para grandes empresas",
        features: [
        "Todo lo del plan premium",
        "API dedicada",
        "Soporte 24/7",
        "SLA garantizado",
        "Personalización"
        ],
        popular: false
    }
    ]

    export function SubscriptionPlans({ currentPlan, onPlanChange }: SubscriptionPlansProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleSubscribe = async (planId: string) => {
        setIsLoading(true)
        
        try {
        const response = await fetch("/api/subscription", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ plan: planId }),
        })

        if (response.ok) {
            toast.success(`Suscripción actualizada al plan ${planId}`)
            onPlanChange(planId)
        } else {
            const error = await response.json()
            toast.error(error.message || "Error al actualizar la suscripción")
        }
        } catch (error) {
        toast.error("Error al actualizar la suscripción")
        } finally {
        setIsLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}>
            {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                    Más Popular
                </Badge>
                </div>
            )}
            <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="flex items-baseline justify-center">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground ml-1">{plan.period}</span>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    {feature}
                    </li>
                ))}
                </ul>
                <Button 
                className="w-full" 
                variant={currentPlan === plan.id ? "secondary" : "default"}
                disabled={isLoading || currentPlan === plan.id}
                onClick={() => handleSubscribe(plan.id)}
                >
                {currentPlan === plan.id ? "Plan Actual" : "Suscribirse"}
                </Button>
            </CardContent>
            </Card>
        ))}
        </div>
    )
}
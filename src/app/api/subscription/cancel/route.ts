import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
        return NextResponse.json(
            { message: "No autorizado" },
            { status: 401 }
        )
        }

        const subscription = await db.subscription.findFirst({
        where: {
            userId: session.user.id,
            status: "active"
        }
        })

        if (!subscription) {
        return NextResponse.json(
            { message: "No hay suscripción activa" },
            { status: 404 }
        )
        }

        await db.subscription.update({
        where: { id: subscription.id },
        data: {
            status: "cancelled"
        }
        })

        return NextResponse.json({
        message: "Suscripción cancelada exitosamente"
        })
    } catch (error) {
        console.error("Error al cancelar suscripción:", error)
        return NextResponse.json(
        { message: "Error interno del servidor" },
        { status: 500 }
        )
    }
}
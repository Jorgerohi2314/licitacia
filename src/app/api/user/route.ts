import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
        return NextResponse.json(
            { message: "No autorizado" },
            { status: 401 }
        )
        }

        const user = await db.user.findUnique({
        where: { id: session.user.id },
        include: {
            subscriptions: {
            where: {
                status: "active"
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 1
            }
        }
        })

        if (!user) {
        return NextResponse.json(
            { message: "Usuario no encontrado" },
            { status: 404 }
        )
        }

        return NextResponse.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            subscription: user.subscriptions[0] || null
        }
        })
    } catch (error) {
        console.error("Error al obtener usuario:", error)
        return NextResponse.json(
        { message: "Error interno del servidor" },
        { status: 500 }
        )
    }
}
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

    const { plan } = await request.json()

    if (!plan || !["free", "premium", "enterprise"].includes(plan)) {
      return NextResponse.json(
        { message: "Plan inválido" },
        { status: 400 }
      )
    }

    // Desactivar suscripciones anteriores
    await db.subscription.updateMany({
      where: {
        userId: session.user.id,
        status: "active"
      },
      data: {
        status: "inactive"
      }
    })

    // Crear nueva suscripción
    const subscription = await db.subscription.create({
      data: {
        userId: session.user.id,
        plan,
        status: "active",
        startDate: new Date(),
        endDate: plan === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días para planes pagos
      }
    })

    return NextResponse.json({
      message: "Suscripción actualizada exitosamente",
      subscription
    })
  } catch (error) {
    console.error("Error al crear suscripción:", error)
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json({
      subscription
    })
  } catch (error) {
    console.error("Error al obtener suscripción:", error)
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
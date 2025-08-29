import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
    try {
        const { name, email, password } = await request.json()

        // Validar campos requeridos
        if (!name || !email || !password) {
        return NextResponse.json(
            { message: "Todos los campos son requeridos" },
            { status: 400 }
        )
        }

        // Verificar si el usuario ya existe
        const existingUser = await db.user.findUnique({
        where: { email }
        })

        if (existingUser) {
        return NextResponse.json(
            { message: "El usuario ya existe" },
            { status: 400 }
        )
        }

        // Crear el usuario
        const user = await db.user.create({
        data: {
            name,
            email,
            // En producción, deberías hashear la contraseña
            // password: await bcrypt.hash(password, 12)
        }
        })

        // Crear suscripción gratuita por defecto
        await db.subscription.create({
        data: {
            userId: user.id,
            status: "active",
            plan: "free"
        }
        })

        return NextResponse.json(
        { message: "Usuario creado exitosamente", user },
        { status: 201 }
        )
    } catch (error) {
        console.error("Error al crear usuario:", error)
        return NextResponse.json(
        { message: "Error interno del servidor" },
        { status: 500 }
        )
    }
}
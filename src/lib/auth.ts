import NextAuth from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export const authOptions = {
    adapter: PrismaAdapter(db),
    providers: [
        CredentialsProvider({
        name: "credentials",
        credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) {
            return null
            }

            const user = await db.user.findUnique({
            where: {
                email: credentials.email
            }
            })

            if (!user) {
            return null
            }

            // Para este ejemplo, vamos a permitir cualquier contraseña
            // En producción, deberías verificar la contraseña con bcrypt
            // const isPasswordValid = await bcrypt.compare(credentials.password, user.password || "")
            
            return {
            id: user.id,
            email: user.email,
            name: user.name,
            }
        }
        })
    ],
    session: {
        strategy: "jwt" as const,
    },
    pages: {
        signIn: "/auth/signin",
        signUp: "/auth/signup",
    },
    callbacks: {
        async jwt({ token, user }) {
        if (user) {
            token.sub = user.id
        }
        return token
        },
        async session({ session, token }) {
        if (token) {
            session.user.id = token.sub
        }
        return session
        },
    },
}

export default NextAuth(authOptions)
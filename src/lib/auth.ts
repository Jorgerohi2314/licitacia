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
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                preferredRegions: true,
                preferredProvinces: true,
                preferredCategories: true,
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
             role: user.role,
             preferredRegions: user.preferredRegions ? JSON.parse(user.preferredRegions) : [],
             preferredProvinces: user.preferredProvinces ? JSON.parse(user.preferredProvinces) : [],
             preferredCategories: user.preferredCategories ? JSON.parse(user.preferredCategories) : [],
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
            token.role = user.role
            token.preferredRegions = user.preferredRegions
            token.preferredProvinces = user.preferredProvinces
            token.preferredCategories = user.preferredCategories
        }
        return token
        },
        async session({ session, token }) {
        if (token) {
            session.user.id = token.sub
            session.user.role = token.role
            session.user.preferredRegions = token.preferredRegions
            session.user.preferredProvinces = token.preferredProvinces
            session.user.preferredCategories = token.preferredCategories
        }
        return session
        },
    },
}

export default NextAuth(authOptions)
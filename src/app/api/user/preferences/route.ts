import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema para validar preferencias
const preferencesSchema = z.object({
  name: z.string().min(2).optional(),
  preferredRegions: z.array(z.string()).optional(),
  preferredProvinces: z.array(z.string()).optional(),
  preferredCategories: z.array(z.string()).optional(),
});

// GET - Obtener preferencias del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        preferredRegions: true,
        preferredProvinces: true,
        preferredCategories: true,
        profileMinBudget: true,
        profileMaxBudget: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Parsear campos JSON
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      preferredRegions: user.preferredRegions ? JSON.parse(user.preferredRegions) : [],
      preferredProvinces: user.preferredProvinces ? JSON.parse(user.preferredProvinces) : [],
      preferredCategories: user.preferredCategories ? JSON.parse(user.preferredCategories) : [],
      minBudget: user.profileMinBudget,
      maxBudget: user.profileMaxBudget,
    });

  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar preferencias del usuario
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = preferencesSchema.parse(body);

    // Construir objeto de actualización
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.name) {
      updateData.name = validatedData.name;
    }

    if (validatedData.preferredRegions !== undefined) {
      updateData.preferredRegions = validatedData.preferredRegions.length > 0 
        ? JSON.stringify(validatedData.preferredRegions) 
        : null;
      // Mantener sincronizado con legacy field
      updateData.profileRegions = updateData.preferredRegions;
    }

    if (validatedData.preferredProvinces !== undefined) {
      updateData.preferredProvinces = validatedData.preferredProvinces.length > 0 
        ? JSON.stringify(validatedData.preferredProvinces) 
        : null;
    }

    if (validatedData.preferredCategories !== undefined) {
      updateData.preferredCategories = validatedData.preferredCategories.length > 0 
        ? JSON.stringify(validatedData.preferredCategories) 
        : null;
      // Mantener sincronizado con legacy field
      updateData.profileSectors = updateData.preferredCategories;
    }

    const updatedUser = await db.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        preferredRegions: true,
        preferredProvinces: true,
        preferredCategories: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Preferencias actualizadas correctamente',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        preferredRegions: updatedUser.preferredRegions ? JSON.parse(updatedUser.preferredRegions) : [],
        preferredProvinces: updatedUser.preferredProvinces ? JSON.parse(updatedUser.preferredProvinces) : [],
        preferredCategories: updatedUser.preferredCategories ? JSON.parse(updatedUser.preferredCategories) : [],
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

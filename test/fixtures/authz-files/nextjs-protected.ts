// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const users = await getUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const user = await createUser(body);
  return NextResponse.json({ user });
}

async function getUsers() {
  return [];
}

async function createUser(data: any) {
  return { id: 1, ...data };
}

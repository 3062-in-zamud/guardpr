// app/api/admin/users/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // No auth check!
  const users = await getUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  // No auth check!
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

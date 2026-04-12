import { NextResponse } from "next/server";
import { adminMessaging } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { token, title, body } = await req.json();

    if (!token) {
        return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const result = await adminMessaging.send({
      token,
      notification: {
        title,
        body,
      },
    });

    return NextResponse.json({ success: true, messageId: result });
  } catch (error: any) {
    console.error("Firebase Send Error:", error);
    return NextResponse.json({ 
      error: "Failed to send notification", 
      details: error.message 
    }, { status: 500 });
  }
}

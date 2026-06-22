import { NextResponse } from "next/server";

const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? "spinnerclow21@gmail.com";

type ContactBody = {
  name?: string;
  email?: string;
  topic?: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactBody;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const topic = String(body.topic ?? "General").trim();
    const message = String(body.message ?? "").trim();

    if (name.length < 2) {
      return validationError("Enter your name.");
    }

    if (!email.includes("@") || email.length < 5) {
      return validationError("Enter a valid email address.");
    }

    if (message.length < 20) {
      return validationError("Message must be at least 20 characters.");
    }

    const delivery = await deliverContactMessage({
      name,
      email,
      topic,
      message
    });

    return NextResponse.json({
      ok: true,
      delivery,
      to: CONTACT_TO_EMAIL
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to submit your message right now." },
      { status: 500 }
    );
  }
}

function validationError(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

async function deliverContactMessage(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}) {
  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
  const payload = {
    to: CONTACT_TO_EMAIL,
    subject: `Snipe contact: ${input.topic}`,
    replyTo: input.email,
    name: input.name,
    email: input.email,
    topic: input.topic,
    message: input.message
  };

  if (!webhookUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Contact delivery is not configured");
    }

    console.info("Snipe contact submission", payload);
    return "development-log";
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Contact webhook failed");
  }

  return "webhook";
}

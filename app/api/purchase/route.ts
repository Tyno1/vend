import { getMachine } from "@/lib/machine";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  let input: unknown = null;
  try {
    input = await request.json();
  } catch {
    // A missing or malformed body is treated as an unreadable purchase (400), not a server error.
  }
  const outcome = getMachine().purchase(input);
  return Response.json(outcome.body, { status: outcome.status, headers: noStore });
}

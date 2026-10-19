import { connection } from "next/server";
import { getMachine } from "@/lib/machine";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  await connection();
  return Response.json(getMachine().remainingCoins(), { headers: noStore });
}

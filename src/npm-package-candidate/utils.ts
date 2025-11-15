import crypto from "crypto";

export function hashTo6Upper(input: string): string {
  const hashHex = crypto.createHash("sha256").update(input, "utf8").digest("hex");
  let value = BigInt("0x" + hashHex);

  const out: string[] = [];
  for (let i = 0; i < 6; i++) {
    const rem = value % 26n; // 0..25
    out.push(String.fromCharCode(Number(rem) + 65)); // 65 == 'A'
    value = value / 26n;
  }

  return out.reverse().join("");
}
